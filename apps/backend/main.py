from fastapi import FastAPI
import psycopg2

def get_password():
    try:
        with open('.env', mode='r') as f:
            content = f.read()
            for l in content.split():
                if(l.startswith('POSTGRES_PASSWORD')):
                    return l.split('=')[1]
    except:
        print("🛑 .env file not defined!")

app = FastAPI()
password = get_password()

print("Password: '"+password+"'")
connection = psycopg2.connect(database="textmessenger_db", user="app_user", password=password, host="localhost", port=5432)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/auth/register")
async def register():
    raise NotImplementedError

@app.post("/auth/login")
async def login():
    raise NotImplementedError

@app.get("/m")
async def get_messages():
    raise NotImplementedError

@app.post("/m")
async def create_chat():
    raise NotImplementedError

@app.put("/m")
async def create_message(id: int):
    raise NotImplementedError

@app.delete("/m")
async def delete_message(id: int):
    raise NotImplementedError

@app.get("/u")
async def get_profile():
    raise NotImplementedError

@app.post("/u")
async def register():
    raise NotImplementedError

@app.put("/u")
async def get_profile(id: int):
    raise NotImplementedError

@app.delete("/u")
async def register(id: int):
    raise NotImplementedError