"use strict";

const { HttpError } = require("../middleware/errorHandler");

const FEEDBACK_TYPE_LABELS = {
  appreciation: "🎉 Appreciation",
  suggestion: "💡 Suggestion & Improvement",
  event_idea: "🚀 Future Event & Workshop Idea",
  issue_bug: "⚠️ Club Issue / Operational Bug",
  general_query: "💬 General Member Query",
};

const RATING_LABELS = {
  1: "😞 Needs Work (1 / 5)",
  2: "😐 Okay (2 / 5)",
  3: "🙂 Good (3 / 5)",
  4: "😍 Great (4 / 5)",
  5: "🔥 Awesome! (5 / 5)",
};

const DEFAULT_GMAIL_RELAY_URL =
  "https://script.google.com/macros/s/AKfycbzZGV_zombq6_Xo6n2FTu1qZcVoURtvZPqkTad3b72Uox5NTOBGxxXepFDZlqqLYVAy/exec";

function createFeedbackService(pool, { now = () => new Date() } = {}) {
  let schemaEnsured = false;

  async function ensureFeedbackSchema() {
    if (schemaEnsured) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_feedbacks (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
          user_email      TEXT NOT NULL,
          user_name       TEXT,
          enrollment_no   TEXT,
          feedback_type   TEXT NOT NULL,
          rating          INT NOT NULL DEFAULT 5,
          message         TEXT NOT NULL,
          email_sent      BOOLEAN NOT NULL DEFAULT false,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS user_feedbacks_user_id_idx ON user_feedbacks(user_id);
        CREATE INDEX IF NOT EXISTS user_feedbacks_created_at_idx ON user_feedbacks(created_at DESC);
      `);
      schemaEnsured = true;
    } catch {
      // Schema may already exist
    }
  }

  async function dispatchEmail({ to = "kph.jiit@gmail.com", subject, htmlBody }) {
    const relayUrl = process.env.GMAIL_RELAY_URL || DEFAULT_GMAIL_RELAY_URL;
    try {
      const res = await fetch(relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify({
          to,
          subject,
          htmlBody,
        }),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch (err) {
      console.warn("[feedbackService] Email relay warning:", err.message);
      return false;
    }
  }

  async function submitFeedback({ user, feedbackType, rating, message }) {
    await ensureFeedbackSchema();

    if (!user || !user.email) {
      throw new HttpError(401, "UNAUTHENTICATED", "Sign in required to submit feedback.");
    }

    const type = String(feedbackType || "").trim().toLowerCase();
    if (!FEEDBACK_TYPE_LABELS[type]) {
      throw new HttpError(
        400,
        "INVALID_FEEDBACK_TYPE",
        "Please select a valid feedback category."
      );
    }

    const numericRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage || trimmedMessage.length < 5) {
      throw new HttpError(
        400,
        "MESSAGE_TOO_SHORT",
        "Please provide feedback with at least 5 characters."
      );
    }

    const userId = user.id || null;
    const userEmail = user.email.toLowerCase().trim();
    const userName = user.display_name || user.displayName || userEmail.split("@")[0];
    const enrollmentNo = user.enrollment_no || user.enrollmentNo || "—";
    const branchBatch = [user.branch, user.batch].filter(Boolean).join(" · ") || "—";

    const typeLabel = FEEDBACK_TYPE_LABELS[type] || type;
    const ratingLabel = RATING_LABELS[numericRating] || `${numericRating} / 5`;

    const { rows } = await pool.query(
      `INSERT INTO user_feedbacks (
        user_id, user_email, user_name, enrollment_no, feedback_type, rating, message, email_sent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, now())
      RETURNING *`,
      [userId, userEmail, userName, enrollmentNo, type, numericRating, trimmedMessage]
    );

    const feedbackId = rows[0].id;
    const dateFormatted = now().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailSubject = `[KPH Feedback - ${typeLabel}] from ${userName} (${enrollmentNo})`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f0c; color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #121914; border: 1px solid #233528; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%); padding: 24px 28px; text-align: left;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
        Knuth Programming Hub — Member Feedback
      </h1>
      <p style="margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
        Received on ${dateFormatted} IST
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 28px;">
      
      <!-- Feedback Type & Rating Badges -->
      <div style="margin-bottom: 22px;">
        <span style="display: inline-block; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.35); color: #4ade80; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-right: 8px;">
          ${typeLabel}
        </span>
        <span style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;">
          Rating: ${ratingLabel}
        </span>
      </div>

      <!-- Member Details -->
      <div style="background: #18221b; border: 1px solid #27392d; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px;">
        <h3 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #86efac;">
          Submitted By
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #94a3b8; padding: 4px 0; width: 120px;">Name:</td>
            <td style="color: #f8fafc; font-weight: 600; padding: 4px 0;">${userName}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 4px 0;">Email:</td>
            <td style="color: #f8fafc; font-weight: 600; padding: 4px 0;">
              <a href="mailto:${userEmail}" style="color: #4ade80; text-decoration: none;">${userEmail}</a>
            </td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 4px 0;">Enrollment:</td>
            <td style="color: #f8fafc; font-weight: 600; padding: 4px 0;">${enrollmentNo}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 4px 0;">Branch / Batch:</td>
            <td style="color: #f8fafc; padding: 4px 0;">${branchBatch}</td>
          </tr>
        </table>
      </div>

      <!-- Feedback Message -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #86efac;">
          Feedback Message
        </h3>
        <div style="background: #0f1611; border-left: 3px solid #22c55e; padding: 16px 18px; border-radius: 4px 10px 10px 4px; font-size: 14.5px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap;">
${trimmedMessage}
        </div>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #233528; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center;">
        Dispatched automatically to kph.jiit@gmail.com from the KPH Dashboard. Feedback ID: ${feedbackId}
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email asynchronously in the background so the user request finishes quickly
    dispatchEmail({
      to: "kph.jiit@gmail.com",
      subject: emailSubject,
      htmlBody,
    })
      .then(async (sent) => {
        if (sent) {
          await pool.query("UPDATE user_feedbacks SET email_sent = true WHERE id = $1", [feedbackId]).catch(() => {});
        }
      })
      .catch(() => {});

    return {
      ok: true,
      id: feedbackId,
      message: "Thank you for your valuable feedback! It has been submitted and sent to kph.jiit@gmail.com.",
    };
  }

  return {
    ensureFeedbackSchema,
    submitFeedback,
  };
}

module.exports = { createFeedbackService };

