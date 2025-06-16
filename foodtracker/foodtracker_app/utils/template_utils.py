from jinja2 import Environment, FileSystemLoader
import os
from starlette.concurrency import run_in_threadpool

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

if not os.path.exists(TEMPLATES_DIR):
    raise FileNotFoundError(f"Katalog szablonów nie istnieje: {TEMPLATES_DIR}")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=True
)

async def render_template(template_name: str, **context) -> str:
    template = env.get_template(template_name)
    return await run_in_threadpool(template.render, **context)
