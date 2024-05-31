import datetime
from apis import awss3
import requests
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib

"""_summary_

This module is used to post pictures to Instagram and Facebook using the Facebook Graph API.

# Variables required:
- meta_id: The Instagram account ID
- ig_access_token: The Instagram access token
- method_of_access: The method of access to the pictures (aws or local)

"""

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET request received from Facebook after user authorization."""
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        # Parse the URL query
        url_path = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url_path.query)
        code = query.get('code', [None])[0]
        # Show a message to the user
        self.wfile.write(f"Authorization successful, you can close this tab.".encode())
        # Use the code to get access token and perform actions
        print(f"Received code: {code}")  # For debug
        self.server.code = code

def listen_for_code(port=8082):
    server = HTTPServer(('localhost', port), CallbackHandler)
    server.code = None  # Initialize code attribute
    server.handle_request()  # Handle a single request then return
    return server.code

def open_browser_for_login(client_id):
    # Define the necessary URL with client_id and the redirect URI
    auth_url = (f"https://www.facebook.com/v19.0/dialog/oauth?response_type=code&client_id={client_id}&"
                f"redirect_uri=http://localhost:8082/callback&"
                f"scope=instagram_basic,pages_show_list")
                # f"scope=instagram_basic,pages_show_list,threads_basic,threads_content_publish")
    webbrowser.open(auth_url)

def get_access_token(code, app_id, app_secret):
    url = "https://graph.facebook.com/v19.0/oauth/access_token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost:8082/callback",
        "client_id": app_id,
        "client_secret": app_secret
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    response = requests.post(url, data=data, headers=headers)
    print(response.headers)
    print(response.status_code)
    print(response.reason)
    return response.json()

def create_container(meta_access_token, image_url, meta_id, description, tags):
    hashtags = " ".join([f"#{tag}" for tag in tags.split()])
    caption = f"{description}\n\n{hashtags}"
    url = f'https://graph.facebook.com/v19.0/{meta_id}/media'
    
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": meta_access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)
    return data["id"]

def publish_media(meta_access_token, meta_id, creation_id):
    url = f'https://graph.facebook.com/v19.0/{meta_id}/media_publish'
    
    payload = {
        "creation_id": creation_id,
        "access_token": meta_access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)


def create_container(meta_access_token, media_url, meta_id, description, tags, media_type="IMAGE", cover_url=None, thumb_offset=None):
    hashtags = " ".join([f"#{tag}" for tag in tags.split()])
    caption = f"{description}\n\n{hashtags}"

    url = f'https://graph.facebook.com/v19.0/{meta_id}/media'
    payload = {
        "caption": caption,
        "access_token": meta_access_token
    }

    if media_type == "IMAGE":
        payload["image_url"] = media_url
    elif media_type == "REELS" or media_type == "VIDEO":
        payload["media_type"] = media_type
        payload["video_url"] = media_url
        if cover_url:
            payload["cover_url"] = cover_url
        if thumb_offset:
            payload["thumb_offset"] = thumb_offset
    elif media_type == "STORIES":
        payload["media_type"] = "STORIES"
        payload["video_url"] = media_url if media_url.endswith(('.mp4', '.mov')) else None
        payload["image_url"] = media_url if media_url.endswith(('.jpg', '.jpeg', '.png')) else None

    response = requests.post(url, params=payload)
    data = response.json()
    print(data)
    return data["id"]

def publish_threads_media(meta_access_token, meta_id, creation_id):
    url = f'https://graph.facebook.com/v19.0/{meta_id}/threads_publish'
    
    payload = {
        "creation_id": creation_id,
        "access_token": meta_access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)

def PostToIG(meta_id, ig_access_token, method_of_access, base_url=None, media_info=None, meta_type="image"):
    if method_of_access == "aws":
        today = datetime.datetime.now()
        folder_name = today.strftime("%Y-%m-%d")  # Use the current date as the folder name
        all_files = awss3.list_files_in_folder(folder_name)
        image_files = [file for file in all_files if not file.endswith('/')]

        for file_name in image_files:
            image_url, description, tags = awss3.generate_url(file_name)
            creation_id = create_container(ig_access_token, image_url, meta_id, description, tags)
            publish_media(ig_access_token, meta_id, creation_id)

    elif method_of_access == "local":
        # Construct the image URL using the base URL and image path from the dict
        if meta_type == "image":
            media_url = f"{base_url}/{media_info['image_path']}"
        if meta_type == "video":
            media_url = f"{base_url}/{media_info['video_path']}"
        description = media_info['description']
        tags = media_info['tags']

        creation_id = create_container(ig_access_token, media_url, meta_id, description, tags)
        publish_media(ig_access_token, meta_id, creation_id)

    return "Pictures posted to IG successfully!"

def PostToThreads(meta_id, fb_access_token, method_of_access, base_url=None, image_info=None):
    if method_of_access == "aws":
        today = datetime.datetime.now()
        folder_name = today.strftime("%Y-%m-%d")  # Use the current date as the folder name
        all_files = awss3.list_files_in_folder(folder_name)
        image_files = [file for file in all_files if not file.endswith('/')]

        for file_name in image_files:
            image_url, description, tags = awss3.generate_url(file_name)
            creation_id = create_threads_container(fb_access_token, image_url, meta_id, description, tags)
            publish_threads_media(fb_access_token, meta_id, creation_id)

    elif method_of_access == "local":
        # Construct the image URL using the base URL and image path from the dict
        image_url = f"{base_url}/{image_info['image_path']}"
        description = image_info['description']
        tags = image_info['tags']

        creation_id = create_threads_container(fb_access_token, image_url, meta_id, description, tags)
        publish_threads_media(fb_access_token, meta_id, creation_id)

    return "Pictures posted to FB successfully!"

