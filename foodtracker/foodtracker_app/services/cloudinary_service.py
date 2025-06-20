import cloudinary
import cloudinary.uploader
from foodtracker_app.settings import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


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
