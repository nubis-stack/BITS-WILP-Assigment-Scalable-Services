import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # local dev only, docker / k8s run this through gunicorn
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5002)), debug=True)
