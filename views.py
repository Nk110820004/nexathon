from flask import Blueprint, render_template, Flask, request, jsonify
from flask_login import  login_required, current_user

views = Blueprint('views', __name__)

@views.route('/contact')
def contact():
    return render_template('contact.html')



@views.route('/faqs')
def faqs():
    return render_template('faqs.html')


@views.route('/')
@login_required
def home():
    return render_template('index.html', user=current_user)

@views.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)


