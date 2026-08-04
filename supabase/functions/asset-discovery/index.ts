import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { STSClient, AssumeRoleCommand } from "https://esm.sh/@aws-sdk/client-sts@3.525.0";
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeSecurityGroupsCommand,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeInternetGatewaysCommand,
  DescribeNatGatewaysCommand,
} from "https://esm.sh/@aws-sdk/client-ec2@3.525.0";
import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
  ListGroupsCommand,
  ListAttachedRolePoliciesCommand,
  GetRoleCommand,
} from "https://esm.sh/@aws-sdk/client-iam@3.525.0";
import {
  S3Client,
  ListBucketsCommand,
  GetBucketPolicyStatusCommand,
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
} from "https://esm.sh/@aws-sdk/client-s3@3.525.0";
import {
  RDSClient,
  DescribeDBInstancesCommand,
} from "https://esm.sh/@aws-sdk/client-rds@3.525.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { assertAwsAccountAccess } from "../_shared/org-guard.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Auth ──
async function validateAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (token === serviceRoleKey) return { isServiceRole: true, userId: undefined };

  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) throw new Error("Invalid JWT");
  return { isServiceRole: false, userId: data.claims.sub as string };
}

// ── STS Role Assumption ──
async function assumeRole(roleArn: string, externalId: string) {
  const sts = new STSClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    },
  });
  const resp = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: "CloudGuardAssetDiscovery",
      ExternalId: externalId,
      DurationSeconds: 3600,
    })
  );
  if (!resp.Credentials) throw new Error("Failed to assume role");
  return {
    accessKeyId: resp.Credentials.AccessKeyId!,
    secretAccessKey: resp.Credentials.SecretAccessKey!,
    sessionToken: resp.Credentials.SessionToken!,
  };
}

type Creds = Awaited<ReturnType<typeof assumeRole>>;

interface GraphNode {
  organization_id: string;
  aws_account_id: string;
  node_type: string;
  resource_id: string;
  resource_name: string | null;
  resource_arn: string | null;
  provider: string;
  region: string | null;
  is_public: boolean;
  is_sensitive: boolean;
  risk_score: number;
  metadata: Record<string, unknown>;
}

// ── Collectors ──
const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"];

async function collectEC2(creds: Creds, orgId: string, accountDbId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  for (const region of REGIONS) {
    try {
      const ec2 = new EC2Client({ region, credentials: creds });
      const resp = await ec2.send(new DescribeInstancesCommand({}));
      for (const res of resp.Reservations || []) {
        for (const inst of res.Instances || []) {
          const nameTag = inst.Tags?.find((t) => t.Key === "Name");
          nodes.push({
            organization_id: orgId,
            aws_account_id: accountDbId,
            node_type: "ec2_instance",
            resource_id: inst.InstanceId!,
            resource_name: nameTag?.Value || inst.InstanceId!,
            resource_arn: `arn:aws:ec2:${region}:*:instance/${inst.InstanceId}`,
            provider: "aws",
            region,
            is_public: !!inst.PublicIpAddress,
            is_sensitive: false,
            risk_score: inst.PublicIpAddress ? 30 : 10,
            metadata: {
              instance_type: inst.InstanceType,
              state: inst.State?.Name,
              public_ip: inst.PublicIpAddress || null,
              private_ip: inst.PrivateIpAddress || null,
              vpc_id: inst.VpcId,
              subnet_id: inst.SubnetId,
              security_groups: inst.SecurityGroups?.map((sg) => sg.GroupId),
              iam_profile: inst.IamInstanceProfile?.Arn,
              launch_time: inst.LaunchTime?.toISOString(),
            },
          });
        }
      }
    } catch (e) {
      console.log(`EC2 scan failed in ${region}:`, e);
    }
  }
  return nodes;
}

async function collectSecurityGroups(creds: Creds, orgId: string, accountDbId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  for (const region of REGIONS) {
    try {
      const ec2 = new EC2Client({ region, credentials: creds });
      const resp = await ec2.send(new DescribeSecurityGroupsCommand({}));
      for (const sg of resp.SecurityGroups || []) {
        const hasPublicIngress = sg.IpPermissions?.some(
          (rule) =>
            rule.IpRanges?.some((r) => r.CidrIp === "0.0.0.0/0") ||
            rule.Ipv6Ranges?.some((r) => r.CidrIpv6 === "::/0")
        );
        nodes.push({
          organization_id: orgId,
          aws_account_id: accountDbId,
          node_type: "security_group",
          resource_id: sg.GroupId!,
          resource_name: sg.GroupName || sg.GroupId!,
          resource_arn: `arn:aws:ec2:${region}:*:security-group/${sg.GroupId}`,
          provider: "aws",
          region,
          is_public: !!hasPublicIngress,
          is_sensitive: false,
          risk_score: hasPublicIngress ? 40 : 5,
          metadata: {
            vpc_id: sg.VpcId,
            description: sg.Description,
            inbound_rules_count: sg.IpPermissions?.length || 0,
            outbound_rules_count: sg.IpPermissionsEgress?.length || 0,
            inbound_rules: sg.IpPermissions,
          },
        });
      }
    } catch (e) {
      console.log(`SG scan failed in ${region}:`, e);
    }
  }
  return nodes;
}

async function collectVPCs(creds: Creds, orgId: string, accountDbId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  for (const region of REGIONS) {
    try {
      const ec2 = new EC2Client({ region, credentials: creds });
      const [vpcs, igws] = await Promise.all([
        ec2.send(new DescribeVpcsCommand({})),
        ec2.send(new DescribeInternetGatewaysCommand({})),
      ]);
      const igwVpcIds = new Set(
        (igws.InternetGateways || []).flatMap((ig) => ig.Attachments?.map((a) => a.VpcId) || [])
      );
      for (const vpc of vpcs.Vpcs || []) {
        const nameTag = vpc.Tags?.find((t) => t.Key === "Name");
        nodes.push({
          organization_id: orgId,
          aws_account_id: accountDbId,
          node_type: "vpc",
          resource_id: vpc.VpcId!,
          resource_name: nameTag?.Value || vpc.VpcId!,
          resource_arn: `arn:aws:ec2:${region}:*:vpc/${vpc.VpcId}`,
          provider: "aws",
          region,
          is_public: igwVpcIds.has(vpc.VpcId!),
          is_sensitive: false,
          risk_score: igwVpcIds.has(vpc.VpcId!) ? 15 : 5,
          metadata: { cidr: vpc.CidrBlock, is_default: vpc.IsDefault, has_igw: igwVpcIds.has(vpc.VpcId!) },
        });
      }
    } catch (e) {
      console.log(`VPC scan failed in ${region}:`, e);
    }
  }
  return nodes;
}

async function collectIAM(creds: Creds, orgId: string, accountDbId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  try {
    const iam = new IAMClient({ region: "us-east-1", credentials: creds });

    // Users
    const users = await iam.send(new ListUsersCommand({}));
    for (const user of users.Users || []) {
      nodes.push({
        organization_id: orgId,
        aws_account_id: accountDbId,
        node_type: "iam_user",
        resource_id: user.UserId!,
        resource_name: user.UserName!,
        resource_arn: user.Arn!,
        provider: "aws",
        region: "global",
        is_public: false,
        is_sensitive: true,
        risk_score: 20,
        metadata: { create_date: user.CreateDate?.toISOString(), path: user.Path },
      });
    }

    // Roles
    const roles = await iam.send(new ListRolesCommand({}));
    for (const role of roles.Roles || []) {
      if (role.Path?.startsWith("/aws-service-role/")) continue; // skip service-linked
      const trustPolicy = typeof role.AssumeRolePolicyDocument === "string"
        ? JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument))
        : role.AssumeRolePolicyDocument;
      const isExternallyAssumable = JSON.stringify(trustPolicy).includes('"*"');
      nodes.push({
        organization_id: orgId,
        aws_account_id: accountDbId,
        node_type: "iam_role",
        resource_id: role.RoleId!,
        resource_name: role.RoleName!,
        resource_arn: role.Arn!,
        provider: "aws",
        region: "global",
        is_public: isExternallyAssumable,
        is_sensitive: true,
        risk_score: isExternallyAssumable ? 50 : 15,
        metadata: {
          trust_policy: trustPolicy,
          max_session_duration: role.MaxSessionDuration,
          path: role.Path,
        },
      });
    }

    // Groups
    const groups = await iam.send(new ListGroupsCommand({}));
    for (const group of groups.Groups || []) {
      nodes.push({
        organization_id: orgId,
        aws_account_id: accountDbId,
        node_type: "iam_group",
        resource_id: group.GroupId!,
        resource_name: group.GroupName!,
        resource_arn: group.Arn!,
        provider: "aws",
        region: "global",
        is_public: false,
        is_sensitive: true,
        risk_score: 10,
        metadata: { path: group.Path },
      });
    }
  } catch (e) {
    console.log("IAM scan failed:", e);
  }
  return nodes;
}

async function collectS3(creds: Creds, orgId: string, accountDbId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  try {
    const s3 = new S3Client({ region: "us-east-1", credentials: creds });
    const buckets = await s3.send(new ListBucketsCommand({}));
    for (const bucket of buckets.Buckets || []) {
      let isPublic = false;
      try {
        const policyStatus = await s3.send(new GetBucketPolicyStatusCommand({ Bucket: bucket.Name! }));
        isPublic = policyStatus.PolicyStatus?.IsPublic ?? false;
      } catch { /* no policy */ }

      if (!isPublic) {
        try {
          const pubBlock = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket.Name! }));
          const cfg = pubBlock.PublicAccessBlockConfiguration;
          if (!cfg?.BlockPublicAcls && !cfg?.BlockPublicPolicy) isPublic = true;
        } catch { /* no block config = potentially public */ isPublic = true; }
      }

      let encrypted = false;
      try {
        await s3.send(new GetBucketEncryptionCommand({ Bucket: bucket.Name! }));
        encrypted = true;
      } catch { /* no encryption */ }

      nodes.push({
        organization_id: orgId,
        aws_account_id: accountDbId,
        node_type: "s3_bucket",
        resource_id: bucket.Name!,
        resource_name: bucket.Name!,
        resource_arn: `arn:aws:s3:::${bucket.Name}`,
        provider: "aws",
        region: "global",
        is_public: isPublic,
        is_sensitive: true,
        risk_score: isPublic ? 60 : encrypted ? 5 : 25,
        metadata: { created: bucket.CreationDate?.toISOString(), is_encrypted: encrypted, is_public: isPublic },
      });
    }
  } catch (e) {
    console.log("S3 scan failed:", e);
  }
  return nodes;
}

async function collectRDS(creds: Creds, orgId: string, accountDbId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  for (const region of REGIONS) {
    try {
      const rds = new RDSClient({ region, credentials: creds });
      const resp = await rds.send(new DescribeDBInstancesCommand({}));
      for (const db of resp.DBInstances || []) {
        nodes.push({
          organization_id: orgId,
          aws_account_id: accountDbId,
          node_type: "rds_instance",
          resource_id: db.DBInstanceIdentifier!,
          resource_name: db.DBInstanceIdentifier!,
          resource_arn: db.DBInstanceArn!,
          provider: "aws",
          region,
          is_public: db.PubliclyAccessible ?? false,
          is_sensitive: true,
          risk_score: db.PubliclyAccessible ? 70 : db.StorageEncrypted ? 10 : 30,
          metadata: {
            engine: db.Engine,
            engine_version: db.EngineVersion,
            instance_class: db.DBInstanceClass,
            storage_encrypted: db.StorageEncrypted,
            multi_az: db.MultiAZ,
            vpc_id: db.DBSubnetGroup?.VpcId,
            security_groups: db.VpcSecurityGroups?.map((sg) => sg.VpcSecurityGroupId),
            endpoint: db.Endpoint?.Address,
            port: db.Endpoint?.Port,
          },
        });
      }
    } catch (e) {
      console.log(`RDS scan failed in ${region}:`, e);
    }
  }
  return nodes;
}

// ── Request Schema ──
const RequestSchema = z.object({
  aws_account_id: z.string().uuid(),
});

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const auth = await validateAuth(req);

    const body = await req.json();
    const { aws_account_id } = RequestSchema.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorization: the account must belong to the caller's organization.
    await assertAwsAccountAccess(supabase, auth, aws_account_id);

    // Get account details
    const { data: account, error: accErr } = await supabase
      .from("aws_accounts")
      .select("*")
      .eq("id", aws_account_id)
      .single();
    if (accErr || !account) throw new Error("Account not found");

    if (!account.role_arn) throw new Error("No IAM role configured for this account");

    // Assume role
    const creds = await assumeRole(account.role_arn, account.external_id);
    const orgId = account.organization_id;

    // Collect all resources in parallel
    const [ec2Nodes, sgNodes, vpcNodes, iamNodes, s3Nodes, rdsNodes] = await Promise.all([
      collectEC2(creds, orgId, aws_account_id),
      collectSecurityGroups(creds, orgId, aws_account_id),
      collectVPCs(creds, orgId, aws_account_id),
      collectIAM(creds, orgId, aws_account_id),
      collectS3(creds, orgId, aws_account_id),
      collectRDS(creds, orgId, aws_account_id),
    ]);

    // Add internet node
    const internetNode: GraphNode = {
      organization_id: orgId,
      aws_account_id: aws_account_id,
      node_type: "external_internet",
      resource_id: `internet-${orgId}`,
      resource_name: "Public Internet",
      resource_arn: null,
      provider: "aws",
      region: "global",
      is_public: true,
      is_sensitive: false,
      risk_score: 0,
      metadata: {},
    };

    const allNodes = [internetNode, ...ec2Nodes, ...sgNodes, ...vpcNodes, ...iamNodes, ...s3Nodes, ...rdsNodes];

    // Upsert nodes (on conflict update metadata)
    const upsertBatchSize = 50;
    let upsertedCount = 0;
    for (let i = 0; i < allNodes.length; i += upsertBatchSize) {
      const batch = allNodes.slice(i, i + upsertBatchSize);
      const { error } = await supabase
        .from("security_graph_nodes")
        .upsert(batch, { onConflict: "organization_id,provider,resource_id" });
      if (error) {
        console.error("Upsert batch error:", error);
      } else {
        upsertedCount += batch.length;
      }
    }

    // Update account last scan
    await supabase
      .from("aws_accounts")
      .update({ last_scan_at: new Date().toISOString() })
      .eq("id", aws_account_id);

    return new Response(
      JSON.stringify({
        success: true,
        discovered: {
          total: allNodes.length,
          ec2: ec2Nodes.length,
          security_groups: sgNodes.length,
          vpcs: vpcNodes.length,
          iam: iamNodes.length,
          s3: s3Nodes.length,
          rds: rdsNodes.length,
        },
        upserted: upsertedCount,
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Asset discovery error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
