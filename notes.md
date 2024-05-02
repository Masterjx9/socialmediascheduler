# Goals

## Finished Goals
- Finish all basic CRUD designs for tkinter app
  - Fix timezones
    - Fix the time shown in the calendar to be the correct timezone - **completed**
    - Fix the time shown in the update menu to be the correct timezone - **completed**
  - CREATE
    - Posting
      - Finish submit_post() function for 1A and 1B options - **completed**
    - Video
      - Finish submit_video() function - **completed**
    - Picture
      - Finish submit_photo() function - **completed**
  - READ
    - Create way to click on an item in the calendar and it bring a popup to modify its data. - **completed**
  - UPDATE - **completed**
    - Create way to modify existing/upcoming content (See READ)
  - Delete
    - Create delete by right clicking on a item and choosing delete which will delete it from the database. This will only be for content that hasn't been posted - **completed**
  - Setup a way to Add and delete social media accounts
    - Add a way to add social media accounts to the database - **completed**
      - Fix issue where the account_id for meta and twitter tables needs to referenced to the account_id in the social_media_accounts table - **completed**
    - Add a way to delete social media accounts from the database - **completed**

## Immediate Goals

  
## Next Set of Goals
- Test Creating a post and it showing up in twitter/x
- Implement Threads api (just came out)
- Use pyexe to create an executable file
- Test Scheduler / Controller with database

## Longer Goals
- Build out account menu to include more options
  - build a way to get social media tokens for the app and store them in the database
- Create basic dart camera/video/post app that also can manages content
- Add a local GPT into the app based on your preferences to automate descriptions, and metadata/tags
