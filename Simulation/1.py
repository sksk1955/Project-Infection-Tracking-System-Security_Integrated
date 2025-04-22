import time
import secrets
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.asymmetric import utils as crypto_utils
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def generate_key_pair():
    """Generates RSA key pair."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return public_key, private_key

def hash_data(data):
    """Hashes data using SHA-256."""
    hasher = hashes.Hash(hashes.SHA256(), backend=default_backend())
    hasher.update(data.encode('utf-8') if isinstance(data, str) else data)
    return hasher.finalize()

def sign_data(private_key, data):
    """Signs data using private key."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    signature = private_key.sign(
        data,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return signature

def verify_signature(public_key, signature, data):
    """Verifies signature using public key."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    try:
        public_key.verify(
            signature,
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False

def encrypt(public_key, data):
    """Encrypts data using RSA."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    encrypted = public_key.encrypt(
        data,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return encrypted

def decrypt(private_key, ciphertext):
    """Decrypts data using RSA."""
    decrypted = private_key.decrypt(
        ciphertext,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return decrypted

class TrustedAuthority:
    def __init__(self):
        self.public_key, self.private_key = generate_key_pair()
        self.adjacency_matrix = {}
        self.id = "TA"
        self.user_public_keys = {}  # Store public keys of all users
    
    def initialize_system(self, miners, ban_users, government_authority):
        """Initializes the system, distributing keys."""
        for miner in miners:
            miner.trusted_authority_public_key = self.public_key
        
        for ban_user in ban_users:
            ban_user.trusted_authority_public_key = self.public_key
            self.user_public_keys[ban_user.id] = ban_user.public_key
        
        government_authority.trusted_authority_public_key = self.public_key
        self.user_public_keys[government_authority.authority_id] = government_authority.public_key

        print("TA: Initializing Adjacency Matrix.")
        for user1 in ban_users:
            for user2 in ban_users:
                if user1.id != user2.id:
                    self.adjacency_matrix[(user1.id, user2.id)] = 0
        
        message = {"adjacency_matrix": self.adjacency_matrix, "type": "init"}
        signature = sign_data(self.private_key, str(self.adjacency_matrix))
        broadcast_to_miners(message, signature, "InitAdjacency", self.id)
    
    def verify_inter_ban_communication(self, user_i_id, user_j_id, timestamp, hash_i, hash_j, signature_i, signature_j):
        """Verifies the inter-BAN communication event."""
        user_i_public_key = self.user_public_keys.get(user_i_id)
        user_j_public_key = self.user_public_keys.get(user_j_id)
        
        if not user_i_public_key or not user_j_public_key:
            print("TA: Unknown user in communication.")
            return False
            
        data_i = f"{user_j_id}{user_i_id}{timestamp}"
        data_j = f"{user_j_id}{user_i_id}{timestamp}{hash_i.hex()}"
        
        valid_i = verify_signature(user_i_public_key, signature_i, data_i)
        valid_j = verify_signature(user_j_public_key, signature_j, data_j)
        
        if valid_i and valid_j:
            print(f"TA: Verified inter-BAN communication between {user_i_id} and {user_j_id}")
            return True
        else:
            print(f"TA: Failed to verify inter-BAN communication between {user_i_id} and {user_j_id}")
            return False

class Miner:
    def __init__(self, miner_id):
        self.miner_id = miner_id
        self.trusted_authority_public_key = None
        self.adjacency_matrix = {}
        self.pending_updates = []  # For consensus algorithm

    def receive_adjacency_matrix_init(self, message, signature, trusted_authority_id):
        """Receives adjacency matrix initialization from TA."""
        if trusted_authority_id != "TA":
            print(f"Miner {self.miner_id}: Error, unauthorized user attempting to create an Adjacency Matrix")
            return
            
        # Verify signature
        if not verify_signature(self.trusted_authority_public_key, signature, str(message["adjacency_matrix"])):
            print(f"Miner {self.miner_id}: Invalid signature for adjacency matrix initialization")
            return
            
        self.adjacency_matrix = message["adjacency_matrix"]
        print(f"Miner {self.miner_id}: Updating blockchain network (adjacency matrix initialization).")
        
        # Implement consensus algorithm (simplified here)
        self.propose_update(self.adjacency_matrix)
    
    def receive_inter_ban_update(self, user_i_id, user_j_id, signature, trusted_authority_id):
        """Receives inter-BAN communication updates from TA."""
        if trusted_authority_id != "TA":
            print(f"Miner {self.miner_id}: Error, unauthorized update attempt")
            return
            
        # Verify signature from TA
        update_data = f"{user_i_id}{user_j_id}"
        if not verify_signature(self.trusted_authority_public_key, signature, update_data):
            print(f"Miner {self.miner_id}: Invalid signature for inter-BAN update")
            return
            
        # Add to pending updates for consensus
        update = {
            "type": "inter_ban_update",
            "user_i": user_i_id,
            "user_j": user_j_id
        }
        self.pending_updates.append(update)
        
        # Simplified consensus - in real implementation, miners would communicate
        # to reach consensus before updating the blockchain
        self.execute_consensus()
    
    def propose_update(self, update):
        """Proposes an update to the blockchain (simplified consensus)."""
        # In a real system, would broadcast to other miners
        self.pending_updates.append(update)
        self.execute_consensus()
    
    def execute_consensus(self):
        """Simulates consensus algorithm execution."""
        # In a real system, this would involve communication between miners
        # to reach agreement on updates
        print(f"Miner {self.miner_id}: Executing consensus algorithm.")
        
        # Process all pending updates
        for update in self.pending_updates:
            if isinstance(update, dict) and update.get("type") == "inter_ban_update":
                user_i = update["user_i"]
                user_j = update["user_j"]
                # Update adjacency matrix as per Algorithm 2, step 5
                self.adjacency_matrix[(user_i, user_j)] = 1
                self.adjacency_matrix[(user_j, user_i)] = 1
                print(f"Miner {self.miner_id}: Updated adjacency matrix for {user_i}-{user_j} to 1")
        
        # Clear pending updates after processing
        self.pending_updates = []
        
        # Update blockchain
        update_blockchain(self.miner_id, self.adjacency_matrix)

class BANUser:
    def __init__(self, user_id):
        self.id = user_id
        self.public_key, self.private_key = generate_key_pair()
        self.trusted_authority_public_key = None
    
    def initiate_communication(self, other_user, timestamp=None):
        """Initiates communication with another BAN user."""
        if timestamp is None:
            timestamp = str(time.time())
        
        # Algorithm 2, step 1: Compute hash and send to other user
        data = f"{other_user.id}{self.id}{timestamp}"
        hash_i = hash_data(data)
        signature = sign_data(self.private_key, data)
        
        # Encrypt using other user's public key
        encrypted_data = encrypt(other_user.public_key, data)
        
        print(f"BU {self.id}: Sending data to BU {other_user.id}")
        return {
            "encrypted_data": encrypted_data,
            "signature": signature,
            "hash": hash_i,
            "timestamp": timestamp
        }
    
    def handle_communication(self, comm_data, sender_id, sender_public_key):
        """Handles communication from another BAN user."""
        # Decrypt the data
        decrypted_data = decrypt(self.private_key, comm_data["encrypted_data"])
        
        # Algorithm 2, step 2: Verify signature
        verified = verify_signature(sender_public_key, comm_data["signature"], decrypted_data)
        
        if not verified:
            print(f"BU {self.id}: Verification failed for communication from {sender_id}")
            return None
        
        print(f"BU {self.id}: Verification successful for communication from {sender_id}")
        
        # Algorithm 2, step 3: Generate response
        timestamp = comm_data["timestamp"]
        hash_i = comm_data["hash"]
        data_j = f"{self.id}{sender_id}{timestamp}{hash_i.hex()}"
        hash_j = hash_data(data_j)
        signature_j = sign_data(self.private_key, data_j)
        
        # Encrypt data for TA
        ta_data = f"{self.id}{sender_id}{timestamp}{hash_i.hex()}"
        encrypted_ta_data = encrypt(self.trusted_authority_public_key, ta_data)
        encrypted_timestamp = encrypt(self.trusted_authority_public_key, timestamp)
        
        print(f"BU {self.id}: Sending handshaking response to TA")
        
        return {
            "hash_j": hash_j,
            "signature_j": signature_j,
            "encrypted_ta_data": encrypted_ta_data,
            "encrypted_timestamp": encrypted_timestamp,
            "sender_id": sender_id,
            "hash_i": hash_i,
            "signature_i": comm_data["signature"]
        }

class GovernmentAuthority:
    def __init__(self, authority_id):
        self.authority_id = authority_id
        self.public_key, self.private_key = generate_key_pair()
        self.trusted_authority_public_key = None

# --- Network Communication ---
def broadcast_to_miners(message, signature, message_type, user_id):
    """Broadcasts a message to all miners."""
    print(f"Broadcasting message of type {message_type} from user: {user_id} to miners")
    
    for miner in miners:
        if message_type == "InitAdjacency":
            miner.receive_adjacency_matrix_init(message, signature, user_id)
        elif message_type == "InterBANUpdate":
            user_i_id = message["user_i"]
            user_j_id = message["user_j"]
            miner.receive_inter_ban_update(user_i_id, user_j_id, signature, user_id)

def update_blockchain(miner_id, adjacency_matrix):
    """Simulates updating the blockchain with new data."""
    print(f"Miner {miner_id} updated blockchain with Adjacency Matrix")

# --- Simulation Functions ---
def simulate_ban_user_interaction(ban_user_i, ban_user_j, trusted_authority):
    """Simulates two BAN users coming into close proximity and communicating."""
    print(f"\n--- Simulating interaction between {ban_user_i.id} and {ban_user_j.id} ---")
    
    # Step 1: BU_i initiates communication
    comm_data = ban_user_i.initiate_communication(ban_user_j)
    
    # Step 2 & 3: BU_j verifies and responds
    response = ban_user_j.handle_communication(comm_data, ban_user_i.id, ban_user_i.public_key)
    
    if response:
        # Step 4: TA verifies and updates blockchain
       verified = trusted_authority.verify_inter_ban_communication(
            ban_user_i.id,
            ban_user_j.id,
            comm_data["timestamp"],  # original timestamp instead of encrypted
            response["hash_i"],
            response["hash_j"],
            response["signature_i"],
            response["signature_j"]
        )
        
    if verified:
            # Broadcast update to miners
            update_message = {
                "type": "inter_ban_update",
                "user_i": ban_user_i.id,
                "user_j": ban_user_j.id
            }
            update_signature = sign_data(
                trusted_authority.private_key, 
                f"{ban_user_i.id}{ban_user_j.id}"
            )
            broadcast_to_miners(update_message, update_signature, "InterBANUpdate", trusted_authority.id)
    
    print(f"--- End of interaction between {ban_user_i.id} and {ban_user_j.id} ---\n")

# --- Main Execution ---
# Create system entities
trusted_authority = TrustedAuthority()
ban_user1 = BANUser("BU1")
ban_user2 = BANUser("BU2")
ban_user3 = BANUser("BU3")
government_authority = GovernmentAuthority("GA1")
miners = [Miner("M1"), Miner("M2")]

# Initialize system
trusted_authority.initialize_system(miners, [ban_user1, ban_user2, ban_user3], government_authority)
print("Setup Phase Completed.\n")

# Simulate interactions
simulate_ban_user_interaction(ban_user1, ban_user2, trusted_authority)
simulate_ban_user_interaction(ban_user2, ban_user3, trusted_authority)