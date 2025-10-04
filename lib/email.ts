import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TrainingAssignmentEmailProps {
  to: string
  employeeName: string
  trainingTitle: string
  trainingDescription?: string
  assignedBy: string
  trainingUrl: string
}

export async function sendTrainingAssignmentEmail({
  to,
  employeeName,
  trainingTitle,
  trainingDescription,
  assignedBy,
  trainingUrl,
}: TrainingAssignmentEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'TrainAI <onboarding@resend.dev>', // Replace with your verified domain
      to: [to],
      subject: `New Training Assigned: ${trainingTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">New Training Assigned</h1>
            </div>

            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-bottom: 10px;">Hi ${employeeName},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">${assignedBy} has assigned you a new training module:</p>

              <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h2 style="margin-top: 0; color: #667eea; font-size: 20px;">${trainingTitle}</h2>
                ${trainingDescription ? `<p style="color: #6b7280; margin-bottom: 0;">${trainingDescription}</p>` : ''}
              </div>

              <p style="font-size: 16px; margin-bottom: 25px;">Click the button below to start your training:</p>

              <div style="text-align: center;">
                <a href="${trainingUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Start Training</a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${trainingUrl}" style="color: #667eea; word-break: break-all;">${trainingUrl}</a>
              </p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>This email was sent from TrainAI</p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}
