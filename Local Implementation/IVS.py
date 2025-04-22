import random
import tenseal as ts  
from datetime import datetime

NUM_PEOPLE = 50 
NUM_INFECTIONS = 5  
THRESHOLD_SAFE = 800  
THRESHOLD_CAUTION = 1200 
class HomomorphicEncryptionWrapper:
    """Wrapper for Fully Homomorphic Encryption (FHE) using TenSEAL."""
    def __init__(self):
        self.context = ts.context(
            scheme=ts.SCHEME_TYPE.CKKS,
            poly_modulus_degree=4096,  # Reduced for speed
            coeff_mod_bit_sizes=[40, 20, 40]
        )
        self.context.generate_galois_keys()
        self.context.global_scale = 2**20  # Lower scale for better performance

    def encrypt(self, data_list):
        """Encrypts a list using CKKS encryption (vectorized storage)."""
        return ts.ckks_vector(self.context, [float(x) for x in data_list])

    def decrypt(self, encrypted_data):
        """Decrypts a CKKS encrypted vector."""
        return encrypted_data.decrypt()  # Returns a list of decrypted values

def generate_adjacency_matrix(fhe_wrapper):
    """Generate adjacency matrix with encrypted multi-infection statuses."""
    adjacency_matrix = [[random.uniform(0, 10) if i != j else 0 for j in range(NUM_PEOPLE)] for i in range(NUM_PEOPLE)]
    
    infected_statuses = [[random.randint(0, 1) for _ in range(NUM_INFECTIONS)] for _ in range(NUM_PEOPLE)]

    encrypted_statuses = [fhe_wrapper.encrypt(status_list) for status_list in infected_statuses]

    for i in range(NUM_PEOPLE):
        adjacency_matrix[i][i] = encrypted_statuses[i]  # Store encrypted infection status in the diagonal

    return adjacency_matrix, encrypted_statuses, infected_statuses

def print_adjacency_matrix(adjacency_matrix, encrypted_statuses, infected_statuses, fhe_wrapper):
    """Prints the adjacency matrix in both encrypted and non-encrypted formats."""

    print("\n🔹 **Non-Encrypted Adjacency Matrix:**")
    for row in adjacency_matrix:
        formatted_row = [
            "ENCRYPTED" if isinstance(x, ts.CKKSVector) else round(x, 2)
            for x in row
        ]
        print(formatted_row)

    print("\n🔹 **Decrypted Infection Status Vectors:**")
    for i, enc_status in enumerate(encrypted_statuses):
        decrypted_status = fhe_wrapper.decrypt(enc_status)
        print(f"Person {i}: {decrypted_status}")

    print("\n🔹 **Infected Status Vectors (Non-Encrypted, Before Encryption):**")
    for i, status in enumerate(infected_statuses):
        print(f"Person {i}: {status}")


def calculate_ivs_score(adjacency_matrix, A_index, fhe_wrapper):
    """Calculate IVS score homomorphically using multi-infection data and optimized traversal."""
    alpha = 5  # Initial base risk score
    susceptibility_factor = random.uniform(0.5, 2.0)

    severity_factors = [[random.uniform(0.1, 2.0) for _ in range(NUM_INFECTIONS)] for _ in range(NUM_PEOPLE)]

    infection_severities = [random.uniform(0.1, 1.0) for _ in range(NUM_INFECTIONS)]
    total_severity = sum(infection_severities)
    weights = [sev / total_severity for sev in infection_severities]  # Normalize to sum = 1

    max_distance = 5  # Limit the search depth to reduce processing time
    ivs_scores = fhe_wrapper.encrypt([alpha] * NUM_INFECTIONS)  # Start with an encrypted IVS vector

    visited = set()  # Track visited nodes to avoid redundant calculations
    queue = [(A_index, 0)]  # BFS traversal (person, distance)
    
    while queue:
        person, distance = queue.pop(0)
        if distance > max_distance or person in visited:
            continue
        visited.add(person)

        for neighbor in range(NUM_PEOPLE):
            if neighbor in visited:
                continue  # Skip previously visited nodes

            if isinstance(adjacency_matrix[person][neighbor], int) and adjacency_matrix[person][neighbor] > 0:
                encrypted_status = adjacency_matrix[neighbor][neighbor]
                ci_vector = severity_factors[neighbor]
                interaction_weight = random.uniform(0.5, 1.0)

                ivs_contribution = [interaction_weight * (1 / (ci ** distance)) * susceptibility_factor for ci in ci_vector]
                encrypted_ivs_contribution = fhe_wrapper.encrypt(ivs_contribution)

                ivs_scores += encrypted_status * encrypted_ivs_contribution

                queue.append((neighbor, distance + 1))

    return ivs_scores, weights  # Returns encrypted IVS score vector and weights

def classify_ivs_score(ivs_scores):
    """Classifies the IVS score for each infection type."""
    classifications = []
    for i, score in enumerate(ivs_scores):
        if score < THRESHOLD_SAFE:
            classifications.append(f"Infection {i+1}: Safe to attend gatherings ✅")
        elif score < THRESHOLD_CAUTION:
            classifications.append(f"Infection {i+1}: Exercise caution; avoid large gatherings ⚠️")
        else:
            classifications.append(f"Infection {i+1}: High risk; should not attend gatherings ❌")
    return classifications

def get_final_decision(final_ivs_score):
    """Determine if a person is allowed to attend based on final IVS score."""
    if final_ivs_score < THRESHOLD_SAFE:
        return "✅ Person is allowed to attend gatherings."
    elif final_ivs_score < THRESHOLD_CAUTION:
        return "⚠️ Person should avoid large gatherings."
    else:
        return "❌ Person is NOT allowed to attend gatherings."

def main():
    fhe_wrapper = HomomorphicEncryptionWrapper()  # Initialize Homomorphic Encryption

    adjacency_matrix, encrypted_statuses, infected_statuses = generate_adjacency_matrix(fhe_wrapper)

    print_adjacency_matrix(adjacency_matrix, encrypted_statuses, infected_statuses, fhe_wrapper)

    while True:
        try:
            A_index = input(f"Enter the index of the person (0 to {NUM_PEOPLE - 1}) to calculate IVS score (or type 'exit' to quit): ").strip()
            if A_index.lower() == 'exit':
                break

            if not A_index.isdigit():
                print("Invalid input. Please enter an integer.")
                continue

            A_index = int(A_index)
            if A_index < 0 or A_index >= NUM_PEOPLE:
                print(f"Please enter a valid index between 0 and {NUM_PEOPLE - 1}.")
                continue

            encrypted_ivs_scores, weights = calculate_ivs_score(adjacency_matrix, A_index, fhe_wrapper)
            decrypted_ivs_scores = fhe_wrapper.decrypt(encrypted_ivs_scores)
            classifications = classify_ivs_score(decrypted_ivs_scores)

            final_ivs_score = sum(decrypted_ivs_scores[i] * weights[i] for i in range(NUM_INFECTIONS))

            print(f"\nIVS Scores for person {A_index}:")
            for i, score in enumerate(decrypted_ivs_scores):
                print(f"Infection {i+1} IVS Score: {score:.2f} (Weight: {weights[i]:.2f})")

            print("\nFinal IVS Score:", f"{final_ivs_score:.2f}")

            print("\nClassification:")
            for classification in classifications:
                print(classification)

            print("\nFinal Decision:", get_final_decision(final_ivs_score))

        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()

