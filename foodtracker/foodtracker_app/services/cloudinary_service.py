import cloudinary
import cloudinary.uploader
from foodtracker_app.settings import settings

# Konfiguracja Cloudinary przy starcie aplikacji
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

# --- POCZĄTEK BLOKU DEBUGOWANIA ---
# Ten blok wypisze w logach wartości, które faktycznie zostały wczytane.
# Usuniemy go, gdy problem zostanie rozwiązany.
print("--- DEBUG CLOUDINARY CONFIG ---")
print(f"Cloud Name loaded: '{settings.CLOUDINARY_CLOUD_NAME}'")
print(f"API Key loaded: '{settings.CLOUDINARY_API_KEY}'")
# Sprawdzamy tylko, czy sekret istnieje i jaka jest jego długość, żeby go nie ujawniać w logach
secret_len = (
    len(settings.CLOUDINARY_API_SECRET) if settings.CLOUDINARY_API_SECRET else 0
)
print(f"API Secret loaded: Present, length={secret_len}")
print("--- KONIEC BLOKU DEBUGOWANIA ---")
# --- KONIEC BLOKU DEBUGOWANIA ---


def upload_image(file_to_upload, public_id: str) -> str | None:
    """
    Wysyła plik do Cloudinary i zwraca jego bezpieczny URL.
    Nadpisuje istniejący plik o tym samym public_id.
    """
    try:
        upload_result = cloudinary.uploader.upload(
            file_to_upload,
            overwrite=True,
            folder="foodtracker_avatars",
            public_id=public_id,
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"Błąd wysyłania do Cloudinary: {e}")
        return None
