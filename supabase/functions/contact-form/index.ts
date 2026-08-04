import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Parse request body
    const formData: ContactFormData = await req.json();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, message" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Validate field lengths
    if (formData.name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    if (formData.message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 5000 characters" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store submission in database
    const { data: submission, error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        company: formData.company?.trim() || null,
        message: formData.message.trim(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Send email notification via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      // HTML-encode every user-supplied value before embedding it in the email.
      const safeName = escapeHtml(formData.name.trim());
      const safeEmail = escapeHtml(formData.email.trim().toLowerCase());
      const safeCompany = formData.company ? escapeHtml(formData.company.trim()) : "";
      const safeMessage = escapeHtml(formData.message.trim());
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SME Cloud Guard <onboarding@resend.dev>",
            to: ["sme.cloudguard26@gmail.com"],
            subject: `New Contact Form Submission from ${formData.name.trim().slice(0, 100)}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0ea5e9;">New Contact Form Submission</h2>
                <hr style="border: 1px solid #e5e7eb;" />
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
                ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ""}
                <p><strong>Message:</strong></p>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${safeMessage}</div>
                <hr style="border: 1px solid #e5e7eb; margin-top: 24px;" />
                <p style="color: #6b7280; font-size: 12px;">
                  Submitted at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                </p>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          // Update submission with email status
          await supabase
            .from("contact_submissions")
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq("id", submission.id);
        } else {
          const emailError = await emailResponse.text();
          console.error("Resend API error:", emailError);
        }
      } catch (emailErr) {
        console.error("Email sending error:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY not configured - email not sent");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your message has been received. We'll get back to you within 24 hours.",
        emailSent,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
