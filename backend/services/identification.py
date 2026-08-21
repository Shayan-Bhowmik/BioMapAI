import base64
import hashlib
import logging
import os
from typing import List, Protocol, TypedDict, Dict, Any
import httpx

logger = logging.getLogger("biomap.identification")


class Prediction(TypedDict):
    common_name: str
    scientific_name: str
    confidence: float
    raw: Dict[str, Any]


class IdentificationProvider(Protocol):
    def identify(self, image_path: str) -> List[Prediction]:
        ...


MOCK_SPECIES_LIST = [
    {"common_name": "Neem", "scientific_name": "Azadirachta indica"},
    {"common_name": "Peepal", "scientific_name": "Ficus religiosa"},
    {"common_name": "House Crow", "scientific_name": "Corvus splendens"},
    {"common_name": "Common Myna", "scientific_name": "Acridotheres tristis"},
    {"common_name": "Rose-ringed Parakeet", "scientific_name": "Psittacula krameri"},
    {"common_name": "Bougainvillea", "scientific_name": "Bougainvillea glabra"},
]


class MockProvider:
    def identify(self, image_path: str) -> List[Prediction]:
        hash_val = 0
        if os.path.exists(image_path):
            with open(image_path, "rb") as f:
                content = f.read()
                hash_val = int(hashlib.md5(content).hexdigest(), 16)
        else:
            hash_val = int(hashlib.md5(image_path.encode()).hexdigest(), 16)

        num_species = len(MOCK_SPECIES_LIST)
        idx1 = hash_val % num_species
        idx2 = (hash_val // 7 + 1) % num_species
        if idx2 == idx1:
            idx2 = (idx1 + 1) % num_species
        idx3 = (hash_val // 13 + 2) % num_species
        if idx3 in (idx1, idx2):
            idx3 = (idx3 + 1) % num_species
            if idx3 in (idx1, idx2):
                idx3 = (idx3 + 1) % num_species

        spec1 = MOCK_SPECIES_LIST[idx1]
        spec2 = MOCK_SPECIES_LIST[idx2]
        spec3 = MOCK_SPECIES_LIST[idx3]

        return [
            {
                "common_name": spec1["common_name"],
                "scientific_name": spec1["scientific_name"],
                "confidence": 0.88,
                "raw": {"provider": "MOCK", "seed": hash_val},
            },
            {
                "common_name": spec2["common_name"],
                "scientific_name": spec2["scientific_name"],
                "confidence": 0.65,
                "raw": {"provider": "MOCK", "seed": hash_val},
            },
            {
                "common_name": spec3["common_name"],
                "scientific_name": spec3["scientific_name"],
                "confidence": 0.42,
                "raw": {"provider": "MOCK", "seed": hash_val},
            },
        ]


class PlantIdProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def identify(self, image_path: str) -> List[Prediction]:
        if not self.api_key:
            raise ValueError("PLANTID_API_KEY is not configured.")

        with open(image_path, "rb") as f:
            b64_image = base64.b64encode(f.read()).decode("utf-8")

        url = "https://plant.id/api/v3/identification"
        headers = {
            "Api-Key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "images": [b64_image],
            "latitude": 28.6139,
            "longitude": 77.2090,
            "similar_images": True,
        }

        transport = httpx.HTTPTransport(retries=1)
        with httpx.Client(transport=transport, timeout=10.0) as client:
            res = client.post(url, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()

        suggestions = data.get("result", {}).get("classification", {}).get("suggestions", [])
        predictions: List[Prediction] = []
        for sug in suggestions[:3]:
            name = sug.get("name", "Unknown Plant")
            details = sug.get("details", {})
            common_names = details.get("common_names", [])
            common_name = common_names[0] if common_names else name
            probability = float(sug.get("probability", 0.0))

            predictions.append(
                {
                    "common_name": common_name,
                    "scientific_name": name,
                    "confidence": round(probability, 2),
                    "raw": sug,
                }
            )

        if not predictions:
            raise ValueError("Plant.id returned empty suggestions.")

        return predictions


class HuggingFaceProvider:
    def __init__(self, api_token: str, model_id: str):
        self.api_token = api_token
        self.model_id = model_id or "google/vit-base-patch16-224"

    def identify(self, image_path: str) -> List[Prediction]:
        if not self.api_token:
            raise ValueError("HF_API_TOKEN is not configured.")

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        url = f"https://api-inference.huggingface.co/models/{self.model_id}"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
        }

        transport = httpx.HTTPTransport(retries=1)
        with httpx.Client(transport=transport, timeout=10.0) as client:
            res = client.post(url, data=image_bytes, headers=headers)
            res.raise_for_status()
            data = res.json()

        if not isinstance(data, list):
            raise ValueError(f"Unexpected HuggingFace response format: {data}")

        predictions: List[Prediction] = []
        for item in data[:3]:
            label = item.get("label", "Unknown")
            score = float(item.get("score", 0.0))

            common_name = label
            scientific_name = label
            if "(" in label and ")" in label:
                parts = label.split("(")
                common_name = parts[0].strip()
                scientific_name = parts[1].replace(")", "").strip()

            predictions.append(
                {
                    "common_name": common_name,
                    "scientific_name": scientific_name,
                    "confidence": round(score, 2),
                    "raw": item,
                }
            )

        if not predictions:
            raise ValueError("HuggingFace model returned empty predictions.")

        return predictions


def identify_species(image_path: str) -> Dict[str, Any]:
    provider_env = os.getenv("AI_PROVIDER", "MOCK").upper().strip()
    
    provider_used = provider_env
    predictions: List[Prediction] = []

    try:
        if provider_env == "PLANTID":
            api_key = os.getenv("PLANTID_API_KEY", "")
            provider = PlantIdProvider(api_key=api_key)
            predictions = provider.identify(image_path)
        elif provider_env == "HUGGINGFACE":
            api_token = os.getenv("HF_API_TOKEN", "")
            model_id = os.getenv("HF_MODEL_ID", "")
            provider = HuggingFaceProvider(api_token=api_token, model_id=model_id)
            predictions = provider.identify(image_path)
        else:
            provider_used = "MOCK"
            provider = MockProvider()
            predictions = provider.identify(image_path)
    except Exception as e:
        logger.warning(f"AI Provider '{provider_env}' failed: {e}. Falling back to MOCK provider.")
        provider_used = "MOCK"
        predictions = MockProvider().identify(image_path)

    return {
        "provider": provider_used,
        "predictions": predictions,
    }
