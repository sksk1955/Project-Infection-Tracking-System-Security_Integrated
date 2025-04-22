import simpy
import random
import hashlib

# Basic simulation parameters
NUM_BAN_USERS = 5
TRANSACTION_DELAY = 2
COMMUNICATION_RANGE = 10

contact_graph = {}
user_locations = {}

# Helper functions for crypto operations
def hash_message(message):
    return hashlib.sha256(message.encode()).hexdigest()

def generate_signature(private_key, message):
    return hash_message(private_key + message)

def verify_signature(private_key, message, signature):
    return generate_signature(private_key, message) == signature

def calculate_distance(location1, location2):
    return ((location1[0] - location2[0])**2 + (location1[1] - location2[1])**2)**0.5

# Main user class that handles movement and communication
class BANUser:
    def __init__(self, env, user_id, ta_public_key, initial_location):
        self.env = env
        self.user_id = user_id
        self.ta_public_key = ta_public_key
        self.private_key = hash_message(f"user_{user_id}_private")
        self.public_key = hash_message(f"user_{user_id}_public")
        self.location = initial_location
        user_locations[user_id] = initial_location
        self.process = env.process(self.run())

    # Main loop for user behavior
    def run(self):
        while True:
            self.location = (self.location[0] + random.randint(-1, 1), self.location[1] + random.randint(-1, 1))
            user_locations[self.user_id] = self.location

            for other_user_id in range(NUM_BAN_USERS):
                if other_user_id != self.user_id:
                  other_location = user_locations[other_user_id]
                  distance = calculate_distance(self.location, other_location)

                  if distance <= COMMUNICATION_RANGE:
                    print(f"Time: {self.env.now} - User {self.user_id} in proximity of User {other_user_id}")
                    yield self.env.process(self.initiate_contact(other_user_id))

            yield self.env.timeout(random.randint(5, 10))

    def initiate_contact(self, other_user_id):
        timestamp = self.env.now
        data = f"{other_user_id}||{self.user_id}||{timestamp}"
        signature = generate_signature(self.private_key, data)

        print(f"Time: {self.env.now} - User {self.user_id} attempting to contact User {other_user_id}")
        yield self.env.process(users[other_user_id].respond_to_contact(self.user_id, data, signature))

    def respond_to_contact(self, sender_id, data, signature):
        timestamp = self.env.now
        if verify_signature(users[sender_id].private_key, data, signature):
            print(f"Time: {self.env.now} - User {self.user_id} received a valid message from User {sender_id}")
            yield env.process(record_contact(self.env, sender_id, self.user_id))
        else:
            print(f"Time: {self.env.now} - User {self.user_id} rejected invalid message from {sender_id}")

# Handles system setup and management
class TrustedAuthority:
    def __init__(self, env):
        self.env = env
        self.public_key = hash_message("TA_public")
        self.private_key = hash_message("TA_private")

    def setup_system(self):
        print("--- System Setup Started ---")
        yield self.env.timeout(TRANSACTION_DELAY)

        for i in range(NUM_BAN_USERS):
            for j in range(NUM_BAN_USERS):
                contact_graph[(i, j)] = 0

        print("Time:", self.env.now, "- TA: Initialized contact graph:", contact_graph)
        print("--- System Setup Complete ---")

def record_contact(env, user1_id, user2_id):
    print(f"Time: {env.now} - Miners: Received request to record contact between User {user1_id} and User {user2_id}")
    yield env.timeout(TRANSACTION_DELAY)

    contact_graph[(user1_id, user2_id)] = 1
    contact_graph[(user2_id, user1_id)] = 1

    print(f"Time: {env.now} - Miners: Recorded contact: {contact_graph}")

# Setup and run simulation
env = simpy.Environment()
ta = TrustedAuthority(env)
env.process(ta.setup_system())

users = [BANUser(env, i, ta.public_key, (random.randint(0, 100), random.randint(0, 100))) for i in range(NUM_BAN_USERS)]

print("Starting simulation...")
env.run(until=50)
print("Simulation complete.")