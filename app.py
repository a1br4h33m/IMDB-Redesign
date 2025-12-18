from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import bcrypt
import jwt
import datetime
from functools import wraps
from dotenv import load_dotenv, dotenv_values
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = '10e7bf11ea19978d5704cd49e73a9c5d370efb0659237f64350bfab10a107d44'

db_config = {
    'host': os.getenv('host'),
    'user': os.getenv('user'),
    'password': os.getenv('password'),
    'database': os.getenv('database')
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"Error connecting to MariaDB: {e}")
        return None

def init_db():
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor()
        
        cursor.execute("CREATE DATABASE IF NOT EXISTS imdb_redesign")
        cursor.execute("USE imdb_redesign")
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Favorites table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                movie_id INT NOT NULL,
                movie_title VARCHAR(500),
                movie_poster VARCHAR(500),
                movie_rating DECIMAL(3,1),
                movie_year VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_favorite (user_id, movie_id)
            )
        """)
        
        # Create admin user if doesn't exist
        cursor.execute("SELECT * FROM users WHERE email = 'admin@admin.admin'")
        if not cursor.fetchone():
            admin_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            cursor.execute(
                "INSERT INTO users (name, email, password, is_admin) VALUES (%s, %s, %s, %s)",
                ('Admin', 'admin@admin.admin', admin_password, True)
            )
            print("✅ Admin user created: admin@admin.admin / admin123")
        
        connection.commit()
        cursor.close()
        connection.close()
        print("✅ Database initialized successfully!")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Flask backend API is running!'}), 200

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    print(f"📝 Signup request received: {email}")
    
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password)
        )
        connection.commit()
        
        user_id = cursor.lastrowid
        
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        cursor.close()
        connection.close()
        
        print(f"✅ User registered successfully: {name}")
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user_id,
                'name': name,
                'email': email,
                'is_admin': False
            }
        }), 201
        
    except Error as e:
        print(f"❌ Database error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    
    print(f"🔐 Login request received: {email}")
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            token = jwt.encode({
                'user_id': user['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            cursor.close()
            connection.close()
            
            print(f"✅ User logged in successfully: {user['name']}")
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'is_admin': bool(user['is_admin'])
                }
            }), 200
        else:
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
            
    except Error as e:
        print(f"❌ Database error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

# Add to favorites
@app.route('/api/favorites/add', methods=['POST'])
@token_required
def add_favorite(current_user_id):
    data = request.get_json()
    
    movie_id = data.get('movie_id')
    movie_title = data.get('movie_title')
    movie_poster = data.get('movie_poster')
    movie_rating = data.get('movie_rating')
    movie_year = data.get('movie_year')
    
    if not movie_id or not movie_title:
        return jsonify({'success': False, 'message': 'Movie ID and title required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        
        cursor.execute(
            """INSERT INTO favorites (user_id, movie_id, movie_title, movie_poster, movie_rating, movie_year) 
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (current_user_id, movie_id, movie_title, movie_poster, movie_rating, movie_year)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        print(f"❤️ Favorite added: {movie_title} by user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Added to favorites'
        }), 201
        
    except Error as e:
        if 'Duplicate entry' in str(e):
            return jsonify({'success': False, 'message': 'Already in favorites'}), 400
        print(f"❌ Database error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

# Remove from favorites
@app.route('/api/favorites/remove', methods=['POST'])
@token_required
def remove_favorite(current_user_id):
    data = request.get_json()
    movie_id = data.get('movie_id')
    
    if not movie_id:
        return jsonify({'success': False, 'message': 'Movie ID required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        
        cursor.execute(
            "DELETE FROM favorites WHERE user_id = %s AND movie_id = %s",
            (current_user_id, movie_id)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        print(f"💔 Favorite removed: movie {movie_id} by user {current_user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Removed from favorites'
        }), 200
        
    except Error as e:
        print(f"❌ Database error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

# Get user favorites
@app.route('/api/favorites', methods=['GET'])
@token_required
def get_favorites(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT * FROM favorites WHERE user_id = %s ORDER BY created_at DESC",
            (current_user_id,)
        )
        favorites = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'favorites': favorites
        }), 200
        
    except Error as e:
        print(f"❌ Database error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

# Check if movie is favorited
@app.route('/api/favorites/check/<int:movie_id>', methods=['GET'])
@token_required
def check_favorite(current_user_id, movie_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        
        cursor.execute(
            "SELECT id FROM favorites WHERE user_id = %s AND movie_id = %s",
            (current_user_id, movie_id)
        )
        is_favorited = cursor.fetchone() is not None
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'is_favorited': is_favorited
        }), 200
        
    except Error as e:
        print(f"❌ Database error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, is_admin, created_at FROM users WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if user:
            return jsonify({'success': True, 'user': user}), 200
        else:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
    except Error as e:
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    connection = get_db_connection()
    if not connection:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, password, is_admin, created_at FROM users ORDER BY created_at DESC")
        users = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        print(f"📊 Admin fetched {len(users)} users")
        
        return jsonify({
            'success': True,
            'users': users,
            'total': len(users)
        }), 200
            
    except Error as e:
        print(f"❌ Admin error: {str(e)}")
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting Flask server...")
    init_db()
    
    try:
        conn = get_db_connection()
        if conn:
            print("✅ Database connected!")
            conn.close()
        else:
            print("❌ Database connection failed!")
    except Exception as err:
        print(f"❌ DB connection error: {err}")
    
    print("🌐 Server running on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)