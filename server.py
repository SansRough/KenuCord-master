import socket
import threading
import json
import time
import requests  # Added for API authentication

class User:
    def __init__(self, username, ip_address, sid, password):
        self.username = username
        self.password = password  # Store password for potential later use
        self.room = "lobby"
        self.last_ping_time = time.time()
        self.ip = ip_address
        self.sid = sid
        self.profile_url = f"/profile/{username}.jpg"
        self.status = "online"
        self.notifications = []  # Bildirimler listesi
        self.unread_messages = {}  # Odalara göre okunmamış mesaj sayısı: {"oda_adı": sayı}
        self.mentioned = False  # @kullanıcı ile bahsedilme durumu

users = {}  # socket -> User
rooms = {
    "lobby": {
        "users": set(),
        "type": "public",
        "password": None
    }
}

lock = threading.Lock()

def authenticate_user(username, password):
    """Authenticate user with the API"""
    try:
        response = requests.get(f"http://localhost/api.php?action=login&user={username}&pass={password}")
        if response.status_code == 200:
            data = response.json()
            print(data)
            # Assuming API returns {"success": true} for valid credentials
            return data.get("status", False)
        return False
    except Exception as e:
        print(f"[!] Authentication Error: {e}")
        return False

def broadcast(room, data, exclude=None):
    for client in rooms[room]["users"]:
        if client != exclude:
            try:
                client.send(json.dumps(data).encode())
            except Exception as e:
                print(f"[!] Broadcast Error: {e}")

def broadcast_to_all(data, exclude=None):
    """Tüm bağlı kullanıcılara mesaj gönderir (oda fark etmeksizin)"""
    for client in users:
        if client != exclude:
            try:
                client.send(json.dumps(data).encode())
            except Exception as e:
                print(f"[!] Broadcast To All Error: {e}")

def send_user_list(room):
    user_list = [users[client].username for client in rooms[room]["users"]]
    data = {"type": "room_users", "users": user_list}
    broadcast(room, data)

# Belirli bir kullanıcıya bildirim gönder
def send_notification(client_socket, notification_type, content, sender=None, room=None):
    if client_socket not in users:
        print(f"[!] Notification için kullanıcı bulunamadı")
        return
    
    # Kritik bildirim kontrolü
    should_send = True
    
    # 1. Göndericinin kendisine bildirim göndermesini engelle
    if sender and users[client_socket].username == sender:
        should_send = False
        print(f"[!] Kendi mesajı için bildirim iptal: {sender}")
    
    # 2. Kullanıcı zaten bu odadaysa, bazı bildirim tiplerini gösterme
    if notification_type == "unread_message" and room and users[client_socket].room == room:
        should_send = False
        print(f"[!] Mevcut oda ({room}) mesajı için bildirim iptal")
    
    # 3. Sistem mesajları için bildirim gösterme
    if sender == "system" or (content and "system" in content.lower()):
        should_send = False
        print(f"[!] Sistem mesajı için bildirim iptal")
    
    # Bildirim göndermeyi iptal et
    if not should_send:
        return
    
    # Bildirim objesini oluştur
    notification = {
        "type": "notification",
        "notification_type": notification_type,
        "content": content,
        "timestamp": time.time(),
        "sender": sender,
        "room": room
    }
    
    print(f"[+] Bildirim gönderiliyor: {notification_type} - Alıcı: {users[client_socket].username}, Gönderen: {sender}, Oda: {room}")
    
    # Kullanıcının bildirim geçmişine ekle (en fazla 50 bildirim sakla)
    users[client_socket].notifications.append(notification)
    if len(users[client_socket].notifications) > 50:
        users[client_socket].notifications.pop(0)
    
    # Bildirimi kullanıcıya gönder
    try:
        client_socket.send(json.dumps(notification).encode())
    except Exception as e:
        print(f"[!] Notification Send Error: {e}")

# Okunmamış mesaj sayısını artır
def increment_unread_messages(room, exclude=None, sender=None):
    print(f"[*] Okunmamış mesaj artırılıyor: Oda={room}, Gönderen={sender}")
    for client in users:
        # Kullanıcı bu odada değilse ve mesajı gönderen değilse okunmamış mesaj sayısını artır
        if client == exclude:
            print(f"[*] Mesajı gönderen olduğu için bildirim gönderilmiyor: {users[client].username if client in users else 'Unknown'}")
            continue
            
        if users[client].room == room:
            print(f"[*] Kullanıcı zaten odada olduğu için bildirim gönderilmiyor: {users[client].username}")
            continue
            
        if users[client].username == sender:
            print(f"[*] Kullanıcı mesajı gönderen olduğu için bildirim gönderilmiyor: {users[client].username}")
            continue
        
        print(f"[+] Okunmamış mesaj artırılıyor: Kullanıcı={users[client].username}, Oda={room}")
        # Okunmamış mesaj sayacını güncelle
        if room not in users[client].unread_messages:
            users[client].unread_messages[room] = 0
        users[client].unread_messages[room] += 1
        
        # Bildirim gönder
        send_notification(
            client,
            "unread_message",
            f"Yeni mesaj: {room} odasında",
            room=room,
            sender=sender
        )

def handle_client(client_socket, addr):
    print(f"[*] Handling client {addr}")
    try:
        data = client_socket.recv(1024).decode()
        user_info = json.loads(data)
        username = user_info["username"]
        password = user_info.get("password", "")  # Get password from login data
        print(username + " " + password)
        
        # Authenticate user
        if not authenticate_user(username, password):
            error_msg = {"type": "auth_error", "msg": "Kullanıcı adı veya şifre hatalı!"}
            client_socket.send(json.dumps(error_msg).encode())
            print(f"[!] Failed authentication attempt: {username}")
            return  # End connection attempt
        
        print(f"[+] User authenticated and connected: {username}")
        user = User(username, addr[0], addr[1], password)
        users[client_socket] = user

        with lock:
            rooms["lobby"]["users"].add(client_socket)

        # Hoş geldin mesajı - Sistem mesajı olarak işaretle
        welcome = {
            "type": "message", 
            "msg": f"{username} sohbete katıldı.", 
            "room": "lobby", 
            "timestamp": time.time(),
            "is_system_message": True,
            "sender": "system"
        }
        broadcast("lobby", welcome)
        send_user_list("lobby")
        
        # Bildirim geçmişini gönder
        notification_history = {
            "type": "notification_history",
            "notifications": user.notifications
        }
        client_socket.send(json.dumps(notification_history).encode())
        
        # Okunmamış mesaj sayılarını gönder
        unread_message_data = {
            "type": "unread_messages",
            "unread": user.unread_messages
        }
        client_socket.send(json.dumps(unread_message_data).encode())

        while True:
            try:
                msg = client_socket.recv(2048).decode()
                if not msg:
                    print(f"[-] Client disconnected: {username}")
                    break
                
                data = json.loads(msg)
                print(f"[>] Received data: {data}")

                # ==== Profil Fotoğrafı Güncelleme ====
                if data["type"] == "profile_picture_update":
                    username = data.get("username")
                    timestamp = data.get("timestamp")
                    
                    if username and timestamp:
                        print(f"[*] {username} profil fotoğrafını güncelledi, timestamp: {timestamp}")
                        # Tüm kullanıcılara profil fotoğrafı güncelleme mesajı gönder
                        update_message = {
                            "type": "profile_picture_update",
                            "username": username,
                            "timestamp": timestamp
                        }
                        # Tüm kullanıcılara bildir (oda fark etmeksizin)
                        broadcast_to_all(update_message)
                        
                        # Kullanıcılara bildirim gönder
                        for client in users:
                            if client != client_socket:  # Bildirimi kendine gönderme
                                send_notification(
                                    client,
                                    "profile_update",
                                    f"{username} profil fotoğrafını güncelledi",
                                    sender=username
                                )

                # ==== Mesaj Gönderme ====
                elif data["type"] == "message":
                    room = users[client_socket].room
                    message_text = data["msg"]
                    sender = username
                    
                    print(f"[*] Mesaj gönderiliyor: Kullanıcı={sender}, Oda={room}, Mesaj={message_text}")
                    
                    # Mesajı tüm odaya gönder - Daha fazla meta veri içerecek şekilde
                    payload = {
                        "type": "message", 
                        "msg": f"{sender}: {message_text}", 
                        "sender": sender, 
                        "room": room, 
                        "timestamp": time.time(),
                        "message_content": message_text,  # Orijinal mesaj içeriği
                        "is_system_message": False  # Normal kullanıcı mesajı
                    }
                    broadcast(room, payload)
                    
                    # Mesajda bahsedilen kullanıcıları bul (@kullanıcı_adı formatında)
                    mentioned_users = []
                    for word in message_text.split():
                        if word.startswith('@'):
                            mentioned_username = word[1:]  # @ işaretini kaldır
                            mentioned_users.append(mentioned_username)
                    
                    # Bahsedilen kullanıcılara bildirim gönder
                    if mentioned_users:
                        for client in users:
                            # Bahsedilen kullanıcı kendisi değilse bildirim gönder
                            if (users[client].username in mentioned_users and 
                                users[client].username != sender and 
                                client != client_socket):  # Çifte kontrol: username ve socket
                                users[client].mentioned = True
                                send_notification(
                                    client,
                                    "mention",
                                    f"{sender} senden bahsetti: {message_text}",
                                    sender=sender,
                                    room=room
                                )
                    
                    # Bu odada olmayan kullanıcılar için okunmamış mesaj sayısını artır
                    # Kendimize gönderilen bildirimleri kesinlikle engelle
                    print(f"[*] Bildirim kontrolleri yapılıyor - Gönderen: {sender}, Client Socket: {client_socket}")
                    increment_unread_messages(room, exclude=client_socket, sender=sender)

                # ==== Oda Değiştirme ====
                elif data["type"] == "switch_room":
                    target = data["room"]
                    password = data.get("password", "")  # Varsayılan değer eklendi
                    print(f"[*] {username} switching to room: {target}")
                    with lock:
                        if target not in rooms:
                            response = {"type": "error", "msg": "Oda bulunamadı."}
                            client_socket.send(json.dumps(response).encode())
                            continue
                        room_data = rooms[target]
                        # Odanın şifresi varsa ve girilen şifre yanlışsa
                        if room_data["password"] and room_data["password"] != password:
                            # Şifre yanlışsa özel bir hata mesajı gönder
                            response = {"type": "room_password_error", "msg": "Şifre hatalı!"}
                            client_socket.send(json.dumps(response).encode())
                            continue
                        
                        old_room = users[client_socket].room
                        rooms[old_room]["users"].remove(client_socket)
                        rooms[target]["users"].add(client_socket)
                        users[client_socket].room = target
                        
                        # Odayı değiştirdiğinde bu odanın okunmamış mesaj sayısını sıfırla
                        if target in users[client_socket].unread_messages:
                            users[client_socket].unread_messages[target] = 0
                            # Güncellenmiş okunmamış mesaj sayılarını gönder
                            unread_message_data = {
                                "type": "unread_messages",
                                "unread": users[client_socket].unread_messages
                            }
                            client_socket.send(json.dumps(unread_message_data).encode())

                        # Oda ayrılma/katılma mesajları - Sistem mesajları olarak işaretle
                        leave_msg = {
                            "type": "message", 
                            "msg": f"{username} odadan ayrıldı.", 
                            "room": old_room, 
                            "timestamp": time.time(),
                            "is_system_message": True,
                            "sender": "system"
                        }
                        join_msg = {
                            "type": "message", 
                            "msg": f"{username} odaya katıldı.", 
                            "room": target, 
                            "timestamp": time.time(),
                            "is_system_message": True,
                            "sender": "system"
                        }
                        
                        broadcast(old_room, leave_msg)
                        broadcast(target, join_msg)
                        
                        # Kullanıcı listelerini güncelle
                        send_user_list(old_room)
                        send_user_list(target)
                        
                        # Oda değiştiği için kullanıcıya bildirim gönder
                        send_notification(
                            client_socket,
                            "room_switch",
                            f"{target} odasına geçiş yaptınız",
                            room=target
                        )

                # ==== Oda Oluşturma ====
                elif data["type"] == "create_room":
                    room_name = data["room"]
                    room_type = data["room_type"]
                    password = data.get("password", None)  # None varsayılan değeri eklendi
                    print(f"[*] {username} is creating room: {room_name}")
                    with lock:
                        if room_name in rooms:
                            client_socket.send(json.dumps({"type": "error", "msg": "Oda zaten var."}).encode())
                        else:
                            rooms[room_name] = {
                                "users": set(),
                                "type": room_type,
                                "password": password
                            }
                            response = {"type": "room_created", "room": room_name}
                            client_socket.send(json.dumps(response).encode())
                    
                            # Yeni oda oluşturulduğunda güncel oda listesini gönder
                            public_rooms = [name for name, info in rooms.items() if info["type"] == "public"]
                            room_list_data = {"type": "room_list", "rooms": public_rooms}
                            broadcast_to_all(room_list_data)
                            
                            # Tüm kullanıcılara yeni oda oluşturulduğuna dair bildirim gönder
                            for client in users:
                                if client != client_socket:  # Oda oluşturan hariç
                                    send_notification(
                                        client,
                                        "new_room",
                                        f"{username} yeni bir oda oluşturdu: {room_name}",
                                        sender=username,
                                        room=room_name
                                    )

                # ==== Public Oda Listesi ====
                elif data["type"] == "get_rooms":
                    print(f"[*] {username} requested room list")
                    with lock:
                        public_rooms = [name for name, info in rooms.items() if info["type"] == "public"]
                        client_socket.send(json.dumps({"type": "room_list", "rooms": public_rooms}).encode())
                
                # ==== Yazıyor Göstergesi ====
                elif data["type"] == "typing_status":
                    room = users[client_socket].room
                    is_typing = data.get("is_typing", False)
                    client_room = data.get("room", "")
                    
                    # Güvenlik kontrolü: İstemcinin gönderdiği oda ile sunucudaki kaydı karşılaştır
                    if client_room and client_room != room:
                        print(f"[!] Typing status room mismatch: User={username}, Server room={room}, Client room={client_room}")
                        # Doğru odayı kullan
                        room = users[client_socket].room
                    
                    print(f"[*] Typing status: User={username}, Room={room}, Is typing={is_typing}")
                    
                    try:
                        # Tüm odadaki kullanıcılara yazıyor durumunu bildir
                        typing_data = {
                            "type": "typing_status",
                            "username": username,
                            "room": room,
                            "is_typing": is_typing
                        }
                        
                        # Kendisi hariç odadaki herkese gönder
                        if room in rooms:
                            broadcast(room, typing_data, exclude=client_socket)
                            print(f"[+] Typing status sent to room {room}")
                        else:
                            print(f"[!] Invalid room for typing status: {room}")
                    except Exception as e:
                        print(f"[!] Error in typing_status handler: {e}")

                # ==== Bildirim İşlemleri ====
                elif data["type"] == "mark_as_read":
                    # Belirli bir odadaki mesajları okundu olarak işaretleme
                    room = data.get("room")
                    if room and room in users[client_socket].unread_messages:
                        users[client_socket].unread_messages[room] = 0
                        # Güncellenmiş okunmamış mesaj sayılarını gönder
                        unread_message_data = {
                            "type": "unread_messages",
                            "unread": users[client_socket].unread_messages
                        }
                        client_socket.send(json.dumps(unread_message_data).encode())
                
                elif data["type"] == "clear_notifications":
                    # Tüm bildirimleri temizle
                    users[client_socket].notifications = []
                    users[client_socket].mentioned = False
                    client_socket.send(json.dumps({"type": "notifications_cleared"}).encode())

            except Exception as e:
                print(f"[!] Error while handling client {username}: {e}")
                break

    finally:
        if client_socket in users:
            username = users[client_socket].username
            room = users[client_socket].room
            print(f"[*] Cleaning up client {username}")
            with lock:
                rooms[room]["users"].discard(client_socket)
                del users[client_socket]
            broadcast(room, {"type": "message", "msg": f"{username} bağlantıyı kesti."})
            send_user_list(room)
        client_socket.close()

def start_server(host='0.0.0.0', port=3169):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((host, port))
    server.listen(5)
    print(f"[+] Server başlatıldı {host}:{port}")

    while True:
        client_socket, addr = server.accept()
        print(f"[>] Bağlantı: {addr}")
        threading.Thread(target=handle_client, args=(client_socket, addr), daemon=True).start()

if __name__ == "__main__":
    start_server()