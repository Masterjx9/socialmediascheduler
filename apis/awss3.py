import dotenv
import os
import boto3
from io import BytesIO
from PIL import Image
from datetime import datetime




dotenv.load_dotenv()

aws_access_key_id = os.environ.get('AWS_ACCESS_KEY_ID')
aws_secret_access_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
region_name = os.environ.get('AWS_REGION')

s3 = boto3.client('s3',
                  aws_access_key_id=aws_access_key_id,
                  aws_secret_access_key=aws_secret_access_key,
                  region_name=region_name)

bucket_name = 'socialmediascheduler'

def get_image_dimensions(image_data):
    image = Image.open(BytesIO(image_data))
    return image.size

def generate_url(key):
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket_name, 'Key': key},
        ExpiresIn=3600
    )
    
    # Get metadata of the object
    metadata_response = s3.head_object(Bucket=bucket_name, Key=key)
    
    # Extract the description and tags from metadata if they exist
    metadata = metadata_response.get('Metadata', {})
    print(metadata)
    description = metadata.get('description', 'No description available')
    tags = metadata.get('tags', 'No tags available')
    
    print(f"Description: {description}")
    print(f"Tags: {tags}")
    
    return url, description, tags


def generate_urls(keys):
    urls = []
    for key in keys:
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=3600
        )
        urls.append(url)
    return urls


def upload_image(image_data, object_name):
    # Get today's date
    today = datetime.now()

    # Format the date to YYYY-MM-DD
    formatted_date = today.strftime("%Y-%m-%d")

    print(formatted_date)
    s3.upload_fileobj(BytesIO(image_data), bucket_name, object_name)
    url = generate_url(object_name)
    return url

def delete_image(object_name):
    s3.delete_object(Bucket=bucket_name, Key=object_name)
    return True