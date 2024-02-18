import controller 
import time
import sqlite3


while True:
    # Connect to the database
    conn = sqlite3.connect('database.sqlite3')
    cursor = conn.cursor()

    # Get the current date
    current_date = time.strftime('%Y-%m-%d %H:%M:%S')
    print(current_date)

    # Query the database for rows with post_date past the current date
    query = "SELECT * FROM content WHERE post_date < ?"
    cursor.execute(query, (current_date,))
    rows = cursor.fetchall()

    # Process the rows and send them to the controller
    for row in rows:
        print(row)
        # # Send row to controller
        # controller.process_row(row)

    # Close the database connection
    conn.close()
    time.sleep(.03)
