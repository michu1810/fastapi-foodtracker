#!/bin/bash
set -e

# startuje beat w tle
celery -A foodtracker_app.celery_worker beat --loglevel=info &

# startuje worker na pierwszym planie
celery -A foodtracker_app.celery_worker worker --loglevel=info --concurrency=2
