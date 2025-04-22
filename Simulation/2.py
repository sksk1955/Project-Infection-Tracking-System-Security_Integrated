import time
import secrets
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import padding as asymmetric_padding

def generate_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return public_key, private_key

def hash_data(data):
    hasher = hashes.Hash(hashes.SHA256(), backend=default_backend())
    hasher.update(data.encode('utf-8'))
    return hasher.finalize().hex()

def encrypt(public_key, data):
    encrypted = public_key.encrypt(
        data.encode('utf-8'),
        asymmetric_padding.OAEP(
            mgf=asymmetric_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return encrypted

def decrypt(private_key, ciphertext):
    decrypted = private_key.decrypt(
        ciphertext,
        asymmetric_padding.OAEP(
            mgf=asymmetric_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return decrypted.decode('utf-8')

class TrustedAuthority:
    def __init__(self):
        self.public_key, self.private_key = generate_key_pair()
        self.adjacency_matrix = {}
        self.id = "TA"
    
    def initialize_system(self, miners, ban_users, government_authority):
        for miner in miners:
            miner.trusted_authority_public_key = self.public_key
        for ban_user in ban_users:
            ban_user.trusted_authority_public_key = self.public_key
        government_authority.trusted_authority_public_key = self.public_key
        
        for user1 in ban_users:
            for user2 in ban_users:
                if user1.id != user2.id:
                    self.adjacency_matrix[(user1.id, user2.id)] = 0
        
        broadcast_to_miners(self.adjacency_matrix, "InitAdjacency", self.id)

class Miner:
    def __init__(self, miner_id):
        self.miner_id = miner_id
        self.trusted_authority_public_key = None
        self.adjacency_matrix = {}

    def receive_adjacency_matrix_init(self, adjacency_matrix, trusted_authority_id):
        if trusted_authority_id == "TA":
            self.adjacency_matrix = adjacency_matrix
            update_blockchain(self.miner_id, self.adjacency_matrix)
        else:
            print("Error, unauthorized user attempting to create an Adjacency Matrix")

class BANUser:
    def __init__(self, user_id):
        self.id = user_id
        self.public_key, self.private_key = generate_key_pair()
        self.trusted_authority_public_key = None

class GovernmentAuthority:
    def __init__(self, authority_id):
        self.authority_id = authority_id
        self.public_key, self.private_key = generate_key_pair()
        self.trusted_authority_public_key = None

def broadcast_to_miners(data, message_type, user_id):
    for miner in miners:
        if message_type == "InitAdjacency":
            miner.receive_adjacency_matrix_init(data, user_id)

def update_blockchain(miner_id, adjacency_matrix):
    print(f"Miner {miner_id} updated blockchain with Adjacency Matrix: {adjacency_matrix}")

trusted_authority = TrustedAuthority()
ban_user1 = BANUser("BU1")
ban_user2 = BANUser("BU2")
ban_user3 = BANUser("BU3")
government_authority = GovernmentAuthority("GA1")
miners = [Miner("M1"), Miner("M2")]

trusted_authority.initialize_system(miners, [ban_user1, ban_user2, ban_user3], government_authority)

def simulate_ban_user_interaction(ban_user_i, ban_user_j, miners, trusted_authority):
    timestamp = str(time.time())
    nonce = secrets.token_hex(16)
    
    data_to_hash = f"{ban_user_j.id}{ban_user_i.id}{timestamp}{nonce}"
    hash_i = hash_data(data_to_hash)
    encrypted_data = encrypt(ban_user_j.public_key, f"{ban_user_j.id}{ban_user_i.id}{timestamp}{nonce}")
    signature_i = hash_i
    print(f"BU {ban_user_i.id}: Sending data to BU {ban_user_j.id}.")
    
    verify_successful = verify_data(encrypted_data, signature_i, ban_user_i.public_key)
    
    if verify_successful:
        data_to_hash_j = f"{ban_user_j.id}{ban_user_i.id}{timestamp}{nonce}SomeRandomData{hash_i}"
        hash_j = hash_data(data_to_hash_j)
        encrypted_data_back = encrypt(trusted_authority.public_key, f"{ban_user_j.id}{ban_user_i.id}{timestamp}{nonce}SomeRandomData{hash_i}")
        encrypted_time = encrypt(trusted_authority.public_key, timestamp)
        signature_j = hash_j
        print(f"BU {ban_user_j.id}: Sends data to TA.")
        handle_ta_communication(ban_user_i.id, ban_user_j.id, timestamp, miners, trusted_authority, hash_i)
    else:
        print("Verify Fail, attack")

def handle_ta_communication(user_i_id, user_j_id, timestamp, miners, trusted_authority, hash_i):
    for miner in miners:
        if miner.miner_id == "M1":
            miner.adjacency_matrix[(user_i_id, user_j_id)] = 1
            miner.adjacency_matrix[(user_j_id, user_i_id)] = 1
            print(f"Miner {miner.miner_id}: Updating adjacency matrix for inter-BAN communication: {(user_i_id, user_j_id)}.")
            update_blockchain(miner.miner_id, miner.adjacency_matrix)

def verify_data(encrypted_data, signature_i, ban_user_i_public_key):
    return True

simulate_ban_user_interaction(ban_user1, ban_user2, miners, trusted_authority)
