import datetime
import awss3
import requests
import os

"""_summary_

This module is used to post pictures to Instagram and Facebook using the Facebook Graph API.

# Variables required:
- ig_id: The Instagram account ID
- ig_access_token: The Instagram access token
- method_of_access: The method of access to the pictures (aws or local)

"""

def create_container(access_token, image_url, account, description, tags):
    hashtags = " ".join([f"#{tag}" for tag in tags.split()])
    caption = f"{description}\n\n{hashtags}"
    url = f'https://graph.facebook.com/v17.0/{account}/media'
    
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)
    return data["id"]

def publish_media(access_token, account, creation_id):
    url = f'https://graph.facebook.com/v17.0/{account}/media_publish'
    
    payload = {
        "creation_id": creation_id,
        "access_token": access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)
    
def PostToIG(ig_id, ig_access_token, method_of_access, base_url=None, image_data=None):
    if method_of_access == "aws":
        today = datetime.datetime.now()
        folder_name = today.strftime("%Y-%m-%d")  # Use the current date as the folder name
        all_files = awss3.list_files_in_folder(folder_name)
        image_files = [file for file in all_files if not file.endswith('/')]

        for file_name in image_files:
            image_url, description, tags = awss3.generate_url(file_name)
            creation_id = create_container(ig_access_token, image_url, ig_id, description, tags)
            publish_media(ig_access_token, ig_id, creation_id)

    elif method_of_access == "local":
        for image_info in image_data:  # image_data is a list of dicts with image info
            # Construct the image URL using the base URL and image path from the dict
            image_url = f"{base_url}/{image_info['image_path']}"
            description = image_info['description']
            tags = image_info['tags']

            creation_id = create_container(ig_access_token, image_url, ig_id, description, tags)
            publish_media(ig_access_token, ig_id, creation_id)

    return "Pictures posted to IG successfully!"