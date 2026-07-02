from flask import Flask, render_template, request, redirect, url_for, session
import mysql.connector
from flask_socketio import SocketIO, send
import re  # Add this import

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

def get_db_connection():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Password$05",
        database="vit",
        port=3306
    )
    return conn

@app.route("/", methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template("login.html")
    
    email = request.form["email"]
    password = request.form["password"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        query = "SELECT username FROM user WHERE email=%s AND password=%s;"
        cursor.execute(query, (email, password))
        user = cursor.fetchone()

    conn.close()

    if user:
        session["username"] = user[0]
        return redirect(url_for("chat"))
    
    return '<h2>Invalid credentials. Try again.</h2>'

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == 'GET':
        return render_template("signup.html")
    
    username = request.form["username"]
    name = request.form["name"]
    password = request.form["password"]
    email = request.form["email"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM user WHERE email=%s;", (email,))
        user_exists = cursor.fetchone()

    if not user_exists:
        with conn.cursor() as cursor:
            query = "INSERT INTO user (username, password, name, email) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (username, password, name, email))
            conn.commit()

        conn.close()
        return redirect(url_for("login"))
    
    conn.close()
    return "<h2>Email already registered. Try logging in.</h2>"

@app.route("/chat")
def chat():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("chat.html", username=session["username"])

@app.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("login"))

@app.route("/index")
def index():
    return redirect(url_for("login"))

users = {}

@socketio.on("connect")
def handle_connect():
    if "username" in session:
        users[request.sid] = session["username"]
        print(f"{session['username']} connected")

@socketio.on("disconnect")
def handle_disconnect():
    username = users.pop(request.sid, "Unknown")
    print(f"{username} disconnected")


@app.route("/profile")
def profile():
    if "username" not in session:
        return redirect(url_for("login"))
    
    username = session["username"]
    conn = get_db_connection()
    with conn.cursor(dictionary=True) as cursor:
        cursor.execute("SELECT points FROM user WHERE username=%s", (username,))
        user_data = cursor.fetchone()
    
    points = user_data['points'] if user_data else 0
    discount = min(points // 100, 50)  # 1 point = 0.01% discount, max 50% discount
    
    return render_template("profile.html", username=username, points=points, discount=discount)

@socketio.on("message")
def handle_message(msg):
    username = users.get(request.sid, "Unknown")
    full_msg = f"{username}: {msg}"
    print(full_msg)
    send(full_msg, broadcast=True)
    
    # Calculate points based on appreciative nature
    points = calculate_points(msg)
    
    # Update user's points in the database
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("UPDATE user SET points = points + %s WHERE username = %s", (points, username))
        conn.commit()
    conn.close()

def calculate_points(message):
    appreciative_words = ['thanks', 'thank you', 'appreciate', 'grateful', 'awesome', 'great', 'excellent']
    points = 0
    
    for word in appreciative_words:
        if re.search(r'\b' + word + r'\b', message.lower()):
            points += 1
    
    return points

if __name__ == "__main__":
    socketio.run(app, debug=True)
