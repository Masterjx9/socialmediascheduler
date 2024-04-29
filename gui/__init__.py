import tkinter as tk
from tkinter import filedialog, \
                    Text, Menu, \
                    Toplevel, Radiobutton, \
                    StringVar, messagebox, \
                    Entry, Button, Label, OptionMenu
import webbrowser
from datetime import date
import yaml
import sqlite3
from globals import root, calendar_frame, month_year_label, month, year
import utils_calendar
import utils

# First thing to do is to create a root window, then hide it until the user selects a user or a user is already selected
root.withdraw()

# Load the content scheduler window
def initialize_main_window(config_path):
    global calendar_frame, month_year_label, month, year
    root.title("Content Scheduler")
    root.geometry("500x400")  

    menu_bar = Menu(root)
    root.config(menu=menu_bar)

    accounts_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Accounts", menu=accounts_menu)
    accounts_menu.add_command(label="Manage Accounts", command=lambda: open_accounts(root, config_path))
    accounts_menu.add_command(label="Manage Social Media Accounts", command=lambda: manage_social_accounts(root, config_path))

    content_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Content", menu=content_menu)
    content_menu.add_command(label="Add Photo", command=lambda: utils.add_photo(config_path))
    content_menu.add_command(label="Add Video", command=lambda: utils.add_video(config_path))
    content_menu.add_command(label="Add Post", command=lambda: utils.add_post(config_path))

    settings_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Settings", menu=settings_menu)
    settings_menu.add_command(label="Manage Settings", command=lambda: open_settings(config_path))

    help_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Help", menu=help_menu)
    help_menu.add_command(label="Help/Support", command=open_support)
    help_menu.add_command(label="About")

    month = date.today().month
    year = date.today().year

    utils_calendar.print_month_year(month, year)
    utils_calendar.make_buttons(config_path)
    utils_calendar.month_generator(config_path)
    root.mainloop()

# Function to select a user
def select_user(config_path):
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)


    # If no current user, prompt for selection or creation
    if not config.get('current_user'):
        user_selection_popup = Toplevel(root)
        user_selection_popup.title("User Selection")
        user_selection_popup.geometry("300x200")  # Adjust size as needed

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        conn = sqlite3.connect(config['DefaultSettings']['database_path'])
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM users")
        users = cur.fetchall()
        conn.close()

        selected_user = StringVar()

        for user in users:
            Radiobutton(user_selection_popup, text=user[1], variable=selected_user, value=user[0]).pack(anchor='w')

        new_user_name = StringVar()
        new_user_entry = Entry(user_selection_popup, textvariable=new_user_name)
        new_user_entry.pack()

        def create_new_user():
            name = new_user_name.get()
            if name:
                conn = sqlite3.connect(config['DefaultSettings']['database_path'])
                cur = conn.cursor()
                cur.execute("INSERT INTO users (name) VALUES (?)", (name,))
                conn.commit()
                user_id = cur.lastrowid
                conn.close()
                config['current_user'] = user_id
                with open(config_path, 'w') as f:
                    yaml.safe_dump(config, f)
                user_selection_popup.destroy()
                root.deiconify()  # Show the root window
                initialize_main_window(root)
            else:
                messagebox.showerror("Error", "Please enter a name for the new user.")

        def select_user():
            if selected_user.get():
                config['current_user'] = selected_user.get()
                with open(config_path, 'w') as f:
                    yaml.safe_dump(config, f)
                user_selection_popup.destroy()
                root.deiconify()  # Show the root window
                initialize_main_window()
            else:
                messagebox.showerror("Error", "Please select a user.")

        Button(user_selection_popup, text="Create New User", command=create_new_user).pack()
        Button(user_selection_popup, text="Select User", command=select_user).pack()

        user_selection_popup.grab_set()
        user_selection_popup.wait_window()
        root.deiconify()  
        initialize_main_window(config_path)
    else:
        root.deiconify()  # Show the root window if a user is already selected
        initialize_main_window(config_path)

# Function to open the Manage Accounts popup
def open_accounts(root, config_path):
    # Load current user from config.yaml
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    print(config)
    current_user_id = config.get('current_user')
    print(current_user_id)

    # If no current user, prompt for selection or creation
    if not current_user_id:
        # Code to prompt for user selection or creation goes here
        pass

    # Continue with opening the Manage Accounts popup
    post_popup = Toplevel(root)
    post_popup.title("Manage Accounts")
    
    # Fetch users from the database
    conn = sqlite3.connect(config['DefaultSettings']['database_path'])
    cur = conn.cursor()
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
    conn.close()
    print(users)
    
    # Create a variable to store the selected user, default to current user
    selected_user = StringVar(value=current_user_id)
    
    # Display the list of users using radiobuttons
    for user in users:
        Radiobutton(post_popup, text=user[1], variable=selected_user, value=user[0]).pack(anchor='w')
    
    def submit_user(config_path):
        if not selected_user.get():
            messagebox.showerror("Error", "Please select a user.")
            return
        
        # Update the current user in the config.yaml file
        config['current_user'] = selected_user.get()
        with open(config_path, 'w') as f:
            yaml.safe_dump(config, f)
        
        print("Selected user:", selected_user.get())
        post_popup.destroy()
    
    submit_button = Button(post_popup, text="Submit User", command=lambda: submit_user(config_path))
    submit_button.pack(pady=5)
    
    post_popup.grab_set()
    post_popup.wait_window(post_popup)

def manage_social_accounts(root, config_path):
    # Load current user from config.yaml
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    print(config)
    current_user_id = config.get('current_user')
    print(current_user_id)

    # If no current user, prompt for selection or creation
    if not current_user_id:
        # Code to prompt for user selection or creation goes here
        pass

    # Continue with opening the Manage Accounts popup
    post_popup = Toplevel(root, width=500, height=500)
    post_popup.title("Manage Social Media Accounts")
    
    # Fetch users from the database
    conn = sqlite3.connect(config['DefaultSettings']['database_path'])
    cur = conn.cursor()

    social_accounts = cur.execute("SELECT * FROM social_media_accounts WHERE user_id = ?", (current_user_id,)).fetchall()

    meta_accounts_count = 0
    twitter_accounts_count = 0

    for account in social_accounts:
        print(account[2])
        if account[2] == 'Meta':
            meta_accounts_data = cur.execute("SELECT * FROM meta_accounts WHERE account_id = ?", (account[0],)).fetchall()
            meta_accounts_count += len(meta_accounts_data)
            for m_account in meta_accounts_data:
                print(f"Meta/Instagram Account: meta_id = {m_account[0]}")
        if account[2] == 'Twitter':
            twitter_accounts_data = cur.execute("SELECT * FROM twitter_accounts WHERE account_id = ?", (account[0],)).fetchall()
            twitter_accounts_count += len(twitter_accounts_data)
            for t_account in twitter_accounts_data:
                print(f"X/Twitter Account: twitter_consumer_key = {t_account[0]}")

    # social media accounts
    social_accounts_label = Label(post_popup, text="Social Media Accounts")
    social_accounts_label.pack()

    def update_accounts_list(*args):
        option = show_accounts_type.get()

        # Clear the listbox
        accounts_list.delete(0, 'end')

        # Fetch the accounts from the database
        if option == 'Meta/Instagram':
            social_accounts = cur.execute("SELECT * FROM social_media_accounts WHERE user_id = ?", (current_user_id,)).fetchall()
            for account in social_accounts:
                accounts_data = cur.execute("SELECT * FROM meta_accounts WHERE account_id = ?", (account[0],)).fetchall()
                for account in accounts_data:
                    print(account[0])
                    print(account[1])
                    print(account[1])
                    print(account[1])
                    print(account[1])
                    print(account[1])
                    print(account[2])
                    print(account[3])
                    print(account[4])
                    accounts_list.insert('end', f"Meta/Instagram Account: {account[1]}")
        elif option == 'X/Twitter':
            social_accounts = cur.execute("SELECT * FROM social_media_accounts WHERE user_id = ?", (current_user_id,)).fetchall()
            for account in social_accounts:
                accounts_data = cur.execute("SELECT * FROM twitter_accounts WHERE account_id = ?", (account[0],)).fetchall()
                for account in accounts_data:
                    accounts_list.insert('end', f"X/Twitter Account: {account[1]}")


    # Create an OptionMenu to choose the option
    show_accounts_type = StringVar()
    show_accounts_type.set("Meta/Instagram")
    show_accounts_type.trace('w', update_accounts_list)
    show_accounts_type_options = ["Meta/Instagram", "X/Twitter"]
    show_accounts_type_dropdown = OptionMenu(post_popup, show_accounts_type, *show_accounts_type_options)
    show_accounts_type_dropdown.pack()
    
    # Create a Listbox to display the accounts
    accounts_list = tk.Listbox(post_popup, height=20, width=200)
    accounts_list.pack()
    
    update_accounts_list()
    
    create_account_button = Button(post_popup, text="Create Account", command=lambda: create_social_account(config_path))
    create_account_button.pack(pady=5)
    
    def create_social_account(config_path):
        social_account_popup = Toplevel(post_popup)
        social_account_popup.title("Create Social Media Account")
        
        account_type_label = Label(social_account_popup, text="Select Account Type:")
        account_type_label.pack()
        
        account_type = StringVar()
        account_type.set("Meta/Instagram")
        account_type_options = ["Meta/Instagram", "X/Twitter"]
        account_type_dropdown = OptionMenu(social_account_popup, account_type, *account_type_options, command=lambda x: update_fields(account_type.get(), field_frame))
        account_type_dropdown.pack()   
        
        
        # Frame to hold dynamically changing fields
        field_frame = tk.Frame(social_account_popup)
        field_frame.pack()
    
        def update_fields(selection, frame):
            # Clear current fields
            print(selection)
            for widget in frame.winfo_children():
                widget.destroy()

            account_name_label = Label(frame, text="Account Name:")
            account_name_label.pack()
            account_name_entry = Entry(frame)
            account_name_entry.pack()

            if selection == "Meta/Instagram":
                meta_id_label = Label(frame, text="Meta ID:")
                meta_id_label.pack()
                meta_id_entry = Entry(frame)
                meta_id_entry.pack()

                meta_token_label = Label(frame, text="Meta Token:")
                meta_token_label.pack()
                meta_token_entry = Entry(frame)
                meta_token_entry.pack()
            
            elif selection == "X/Twitter":
                consumer_key_label = Label(frame, text="Twitter Consumer Key:")
                consumer_key_label.pack()
                consumer_key_entry = Entry(frame)
                consumer_key_entry.pack()

                consumer_secret_label = Label(frame, text="Twitter Consumer Secret:")
                consumer_secret_label.pack()
                consumer_secret_entry = Entry(frame)
                consumer_secret_entry.pack()

                access_token_label = Label(frame, text="Twitter Access Token:")
                access_token_label.pack()
                access_token_entry = Entry(frame)
                access_token_entry.pack()

                access_token_secret_label = Label(frame, text="Twitter Access Token Secret:")
                access_token_secret_label.pack()
                access_token_secret_entry = Entry(frame)
                access_token_secret_entry.pack()
             
        update_fields(account_type.get(), field_frame)
        
        # submit_button = Button(social_account_popup, text="Submit Account", command=submit_social_account)
        submit_button = Button(social_account_popup, text="Submit Account", command=lambda: submit_social_account(account_type.get(), field_frame, post_popup, social_account_popup))
        # submit_button = Button(social_account_popup, text="Submit Account", command=lambda: submit_social_account(account_type.get(), field_frame, config_path, post_popup, social_account_popup))
        submit_button.pack(pady=5)
        
        def submit_social_account(account_type, frame, post_popup, social_account_popup):
            # Fetch entered data from frame's children, which are the labels and entries
            entries = [e for e in frame.winfo_children() if isinstance(e, Entry)]
            values = [e.get() for e in entries]

            if any(not value for value in values):
                messagebox.showerror("Error", "Please enter all fields.")
                return

            conn = sqlite3.connect(config['DefaultSettings']['database_path'])
            cur = conn.cursor()

            # Process based on account type
            if account_type == "Meta/Instagram":
                # Assuming order is Account Name, Meta ID, Meta Token
                cur.execute("INSERT INTO meta_accounts (account_id, account_name, meta_id, meta_token) VALUES (?, ?, ?, ?)", (current_user_id, values[0], values[1], values[2]))
            elif account_type == "X/Twitter":
                # Assuming order is Account Name, Consumer Key, Consumer Secret, Access Token, Access Token Secret
                cur.execute("INSERT INTO twitter_accounts (account_id, account_name, twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret) VALUES (?, ?, ?, ?, ?, ?)", (current_user_id, values[0], values[1], values[2], values[3], values[4]))

            conn.commit()
            conn.close()

            social_account_popup.destroy()
            post_popup.destroy()
            

    
    def delete_social_account():
        selected_index = accounts_list.curselection()
        if not selected_index:
            messagebox.showerror("Error", "No account selected")
            return
        selected_account = accounts_list.get(selected_index[0])
        account_id = selected_account.split(': ')[1]  # Assumes format "Account Type: account_id = XYZ"

        # Confirm deletion
        social_account_delete = messagebox.askyesno("Delete Account", f"Are you sure you want to delete this account: {selected_account}?")
        if social_account_delete:
            conn = sqlite3.connect(config['DefaultSettings']['database_path'])
            cur = conn.cursor()

            # Delete account based on type inferred from the listbox text
            if "Meta/Instagram" in selected_account:
                cur.execute("DELETE FROM meta_accounts WHERE account_id = ?", (account_id,))
                cur.execute("DELETE FROM social_media_accounts WHERE account_id = ?", (account_id,))
            elif "X/Twitter" in selected_account:
                cur.execute("DELETE FROM twitter_accounts WHERE account_id = ?", (account_id,))
                cur.execute("DELETE FROM social_media_accounts WHERE account_id = ?", (account_id,))

            conn.commit()
            conn.close()

        # Update list
        accounts_list.delete(selected_index[0])
        messagebox.showinfo("Success", "Account deleted successfully.")
    delete_account_button = Button(post_popup, text="Delete Account", command=delete_social_account)
    delete_account_button.pack(pady=5)
    
    post_popup.grab_set()
    post_popup.wait_window(post_popup)
    
def open_support():
    webbrowser.open('https://github.com/Masterjx9/socialmediascheduler/issues')

def open_settings(config_path):
    settings_popup = Toplevel(root)
    settings_popup.geometry("300x300")
    settings_popup.title("Manage Settings")

    # Load current settings
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    # Create entry widgets for each setting
    database_label = Label(settings_popup, text="Database Path:")
    database_label.pack()
    database_entry = Entry(settings_popup)
    database_entry.pack()
    database_entry.insert(0, config['DefaultSettings']['database_path'])  

    mode_label = Label(settings_popup, text="Mode:")
    mode_label.pack()
    mode_entry = Entry(settings_popup)
    mode_entry.pack()
    mode_entry.insert(0, config['DefaultSettings']['mode'])  

    photo_label = Label(settings_popup, text="Photo Path:")
    photo_label.pack()
    photo_entry = Entry(settings_popup)
    photo_entry.pack()
    photo_entry.insert(0, config['DefaultSettings']['photo_path'])  

    video_label = Label(settings_popup, text="Video Path:")
    video_label.pack()
    video_entry = Entry(settings_popup)
    video_entry.pack()
    video_entry.insert(0, config['DefaultSettings']['video_path'])  
    
    default_video_time_label = Label(settings_popup, text="Default Video Time:")
    default_video_time_label.pack()
    default_video_time_entry = Entry(settings_popup)
    default_video_time_entry.pack()
    default_video_time_entry.insert(0, config['DefaultSettings']['default_video_time'])
    
    default_timezone_label = Label(settings_popup, text="Default Timezone:")
    default_timezone_label.pack()
    default_timezone_entry = Entry(settings_popup)
    default_timezone_entry.pack()
    default_timezone_entry.insert(0, config['DefaultSettings']['timezone'])

    def save_settings():
        # Update config with values from entry widgets
        config['DefaultSettings']['database_path'] = database_entry.get()
        config['DefaultSettings']['mode'] = mode_entry.get()
        config['DefaultSettings']['photo_path'] = photo_entry.get()
        config['DefaultSettings']['video_path'] = video_entry.get()

        # Write updated config back to file
        with open(config_path, 'w') as f:
            yaml.dump(config, f)

        settings_popup.destroy()

    # Save button
    save_button = Button(settings_popup, text="Save Settings", command=save_settings)
    save_button.pack()

    settings_popup.grab_set()
    settings_popup.wait_window(settings_popup)

def create_app(config_path):    
    select_user(config_path)
    root.mainloop()    