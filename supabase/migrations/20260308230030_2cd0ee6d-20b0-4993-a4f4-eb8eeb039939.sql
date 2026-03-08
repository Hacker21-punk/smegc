
ALTER TABLE public.kubernetes_clusters
  ADD CONSTRAINT kubernetes_clusters_org_name_unique UNIQUE (organization_id, cluster_name);

ALTER TABLE public.kubernetes_resources
  ADD CONSTRAINT kubernetes_resources_cluster_kind_name_ns_unique UNIQUE (cluster_id, resource_kind, resource_name, namespace);
