# Text Messenger
Architektura i komunikacja między systemami i bazami danych
* [Jakub Kuśmierek](github.com/jkkusmi/) (51798)
* Bartosz Kurach (51787)

### ⚙️ Starting up
* Backend (`./apps/backend`)
	1. Navigate into the `./apps/backend/` directory.
	2. Download required components:
		1. Obtain the `.env` file and place it inside of the `backend` directory.
		2. For Python (FastAPI), activate venv with `/venv/bin/activate`. Download requirements with `pip install -r ./requirements.txt`.
		3. Docker will automatically download the latest image.
	3. Start the database via Docker with `docker-compose up -d` (run in detached mode.)
	4. After the database has been initialised, start the backend app with `fastapi dev` (development environment.)
* Frontend (`/apps/frontend`)
	1. Download the required modules with a preferred package manager, like `npm install` or `yarn install`.
	2. Start the app with `npm run dev`.