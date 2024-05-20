import requests
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib
import json
import os
"""_summary_
This module is used to post text, images, and videos to LinkedIn using the LinkedIn API.
"""
class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET request received from LinkedIn after user authorization."""
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

def listen_for_code(port=8080):
    server = HTTPServer(('localhost', port), CallbackHandler)
    server.code = None  # Initialize code attribute
    server.handle_request()  # Handle a single request then return
    return server.code

def open_browser_for_login(client_id):
    # Define the necessary URL with client_id and the redirect URI
    auth_url = (f"https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={client_id}&"
                f"redirect_uri=http://localhost:8080/callback&scope=openid%20profile%20w_member_social")
    webbrowser.open(auth_url)

def get_access_token(code, app_id, app_secret):
    url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost:8080/callback",
        "client_id": app_id,
        "client_secret": app_secret
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    response = requests.post(url, data=data, headers=headers)
    return response.json()

def get_user_info(access_token):
    url = "https://api.linkedin.com/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    return response.json()

    
def initailize_upload(access_token, media_type, file_size=None):
    person_urn = get_user_info(access_token).get('sub')
    url = f"https://api.linkedin.com/rest/{media_type}s?action=initializeUpload"
    post_headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202304",
        "Content-Type": "application/json"
    }
    post_body = {
        "initializeUploadRequest": {
            "owner": f"urn:li:person:{person_urn}"
        }
    }
    if media_type == "video":
        post_body["initializeUploadRequest"]["fileSizeBytes"] = file_size
        post_body["initializeUploadRequest"]["uploadCaptions"] = False
        post_body["initializeUploadRequest"]["uploadThumbnail"] = False
    response = requests.post(url, headers=post_headers, json=post_body)
    print(response.reason)
    print(response.status_code)
    # print(response.text)
    # print(response.json()["value"]["uploadUrl"])
    return response.json()["value"]

def upload_video_parts(upload_instructions, file_path):
    chunk_size = 4 * 1024 * 1024  # 4 MB
    uploaded_part_ids = []
    with open(file_path, 'rb') as file:
        for instruction in upload_instructions:
            upload_url = instruction["uploadUrl"]
            first_byte = instruction["firstByte"]
            last_byte = instruction["lastByte"]
            file.seek(first_byte)
            chunk = file.read(last_byte - first_byte + 1)
            headers = {
                "Content-Type": "application/octet-stream"
            }
            response = requests.put(upload_url, data=chunk, headers=headers)
            if response.status_code != 200 and response.status_code != 201:
                raise Exception(f"Failed to upload chunk: {response.text}")
            uploaded_part_ids.append(response.headers["etag"])
            print(f"Uploaded bytes {first_byte}-{last_byte}")
    return uploaded_part_ids


def finalize_video_upload(access_token, video_urn, uploaded_part_ids):
    url = "https://api.linkedin.com/rest/videos?action=finalizeUpload"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202304",
        "Content-Type": "application/json"
    }
    post_body = {
        "finalizeUploadRequest": {
            "video": video_urn,
            "uploadToken": "",
            "uploadedPartIds": uploaded_part_ids
        }
    }
    response = requests.post(url, headers=headers, json=post_body)
    if response.status_code != 200:
        raise Exception(f"Failed to finalize upload: {response.text}")
    print("Video upload finalized")

def postMediaToLinkedIn(access_token, media_type, media_url, tags=None ):
    person_urn = get_user_info(access_token).get('sub')
    if media_type == "video":
        file_size = os.path.getsize(media_url[f"{media_type}_path"])
        video_data = initailize_upload(access_token, media_type, file_size)
        upload_instructions = video_data["uploadInstructions"]
        video_urn = video_data[media_type]
        
        uploaded_part_ids = upload_video_parts(upload_instructions, media_url[f"{media_type}_path"])
        finalize_video_upload(access_token, video_urn, uploaded_part_ids)

        media_urn = video_urn
        media_title = "Video Post"
    if media_type == "image":
        image_data = initailize_upload(access_token, media_type)
        print(image_data)
        upload_url = image_data["uploadUrl"]
        media_urn = image_data[media_type]

        put_headers = {
            "Authorization": f"Bearer {access_token}"
        }
            
        with open(media_url[f"{media_type}_path"], 'rb') as media_file:

            upload_response = requests.put(upload_url, data=media_file, headers=put_headers)
            if upload_response.status_code != 200 and upload_response.status_code != 201:
                raise Exception(f"Image upload failed: {upload_response.text}")
        media_title = "Image Post"

    post_headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202304",
        "Content-Type": "application/json"
    }

    post_body = {
        "author": f"urn:li:person:{person_urn}",
        "commentary": media_url["description"],
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
    }
    if media_type == "video" or media_type == "image":
        post_body["content"] ={
            "media" : 
            {
            "title": media_title,
            "id": media_urn
            }
        }
    print(post_body)
    response = requests.post("https://api.linkedin.com/rest/posts", headers=post_headers, json=post_body)
    print(response.reason)
    print(response.status_code)
    print(response.text)