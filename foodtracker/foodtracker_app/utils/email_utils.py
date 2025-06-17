from email.message import EmailMessage

from aiosmtplib import SMTP
from foodtracker_app.settings import settings

SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
MAIL_FROM = settings.MAIL_FROM
MAIL_FROM_NAME = settings.MAIL_FROM_NAME


async def send_email_async(to_email: str, subject: str, body: str, html: str = None):
    if settings.DEMO_MODE:
        print(f"[DEMO_MODE] NIE wysyłam maila do {to_email} (tytuł: {subject})")
        return
    message = EmailMessage()
    message["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    print(f"📨 Wysyłam maila do {to_email}")
    print(f"Temat: {subject}")
    print(f"TREŚĆ (plain):\n{body}")
    print(f"TREŚĆ (html):\n{html}")
    if html:
        message.add_alternative(html, subtype="html")

    smtp = SMTP(hostname=SMTP_HOST, port=SMTP_PORT, start_tls=True)
    try:
        await smtp.connect()
        await smtp.login(SMTP_USER, SMTP_PASSWORD)
        await smtp.send_message(message)
        await smtp.quit()
    except Exception as e:
        print(f"❌ Błąd SMTP: {e}")
