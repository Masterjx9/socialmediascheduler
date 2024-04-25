# Social Media Scheduler

The Social Media Scheduler is an application that allows users to schedule and manage their social media posts across various platforms. It integrates with the following APIs:

- Meta/Facebook API
- YouTube API
- TikTok API
- Instagram API
- Twitter API

## Diagram
![Diagram](diagram.png)

## Features

- Schedule posts: Users can schedule posts to be published on their social media accounts at a specific date and time.
- Platform integration: The application seamlessly integrates with Meta/Facebook, YouTube, TikTok, Instagram, and Twitter APIs to fetch user data and publish posts.
- Database backend: The application uses SQLite as the database backend to store user information, scheduled posts, and API credentials securely.

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/social-media-scheduler.git
    ```

2. Install the required dependencies:

    ```bash
    npm install
    ```

3. Set up API credentials:

    - Meta/Facebook API: Follow the official documentation to obtain the required credentials.
    - YouTube API: Follow the official documentation to obtain the required credentials.
    - TikTok API: Follow the official documentation to obtain the required credentials.
    - Instagram API: Follow the official documentation to obtain the required credentials.
    - Twitter API: Follow the official documentation to obtain the required credentials.

4. Configure the application:

    - Create a `.env` file in the root directory of the project.
    - Add the following environment variables to the `.env` file:

      ```plaintext
      META_FACEBOOK_API_KEY=your-api-key
      META_FACEBOOK_API_SECRET=your-api-secret
      YOUTUBE_API_KEY=your-api-key
      TIKTOK_API_KEY=your-api-key
      INSTAGRAM_API_KEY=your-api-key
      TWITTER_API_KEY=your-api-key
      ```

5. Start the application:

    ```bash
    npm start
    ```

## Usage

1. Sign in to your social media accounts within the application.
2. Create a new post and specify the date and time for it to be published.
3. The application will automatically publish the post on the scheduled date and time.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

You can also read the notes.md file for more information on the project. - [notes.md](notes.md)

## License

This project is licensed under the [MIT License](LICENSE).