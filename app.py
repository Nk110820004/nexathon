from flask import Flask,render_template,url_for,request,redirect,flash
import mysql.connector
app=Flask(__name__)
conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Password$05",
            database="vit",
            port=3306
        )
@app.route("/login",methods=['GET','POST'])
def login():
    if request.method=='GET':
        return render_template("login.html")
    else:
        email=request.form["email"]
        password=request.form["password"]
        cursor=conn.cursor()
        login_querry="select email,password,username from user where email=%s and password=%s;"
        cursor.execute(login_querry,(email,password))
        logind=cursor.fetchone()
        cursor.close()
        if logind:
            return redirect(url_for("home", user=logind[2]))
        else:
            return '<h2>sorry</h2>'
@app.route("/signup",methods=["GET","POST"])
def signup():
    if request.method=='GET':
        return  render_template('signup.html')
    else:
        username=request.form["username"]
        name=request.form["name"]
        password=request.form["password"]
        email=request.form["email"]
        cursor=conn.cursor()
        check_querry="select * from user where email=%s;"
        cursor.execute(check_querry,(email,))
        lt=cursor.fetchone()
        conn.commit()
        cursor.close()
        if lt is None:
            curs=conn.cursor()
            insrt="INSERT INTO user (username,password,name,email) VALUES (%s, %s, %s, %s)"
            curs.execute(insrt, (username, password, name, email))
            conn.commit()
            curs.close()
            return redirect(url_for("login"))
        else:
            return redirect(url_for("login"))

@app.route("/<user>")
def home(user):
    return render_template("index.html",user=user)
@app.route("/logout")
def logout():
    return 'logout'
if __name__ == "__main__":
    app.run(debug=True)
