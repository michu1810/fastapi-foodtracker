from foodtracker_app.utils.email_utils import send_email_async
from foodtracker_app.utils.template_utils import render_template

async def send_email_reminder(to_email: str, products: list):
    if not products:
        return

    subject = "🧊 Produkty niedługo się przeterminują"


    body = "Masz produkty, które mogą się przeterminować:\n\n" + "\n".join(
        f"- {p.name} (do {p.expiration_date})" for p in products
    )


    html = render_template("email_reminder.html", email=to_email, products=products)

    await send_email_async(to_email, subject, body, html)