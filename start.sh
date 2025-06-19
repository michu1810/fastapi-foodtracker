#!/bin/bash
alembic -c foodtracker_app/alembic.ini upgrade head
exec "$@"
