# Text Messenger: Project Backend

This repository runs on a PostgreSQL + FastAPI combination.
### ⚡ Starting up
To ensure proper operation of the backend component, both the database and FastAPI need to be running.
1. Start the database with `docker-compose up -d`to run the Docker image in the 'detached' mode.
2. Start the FastAPI component with `fastapi dev` (development mode)
⚠️ **IMPORTANT**: Ensure that the `.env` is located in the same directory as the `docker-compose.yml` and `main.py` files. The environment file is not present in the GitHub repository by default, as it may contain unencrypted passwords.

### 🧰 Troubleshooting
In case of a problem:
* Use `docker logs postgres_db` to verify if the database has been started.
* Use `docker ps` to check if the database port is exposed and matches the one being used.
* Ensure your `.env` file is up to date.