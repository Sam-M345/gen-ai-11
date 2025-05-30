import subprocess
import webbrowser
import time
import os
import urllib.request # Added for checking server status
from urllib.error import URLError # Added for error handling
import socket # Added for socket.timeout

# Define the command to run
command = "npm run dev"

# Define the URL to open
url = "http://localhost:3000"

# Get the absolute path to the project directory
project_dir = r"C:\Users\Sam\Desktop\Side Projects\Gen-AI-11\GenAI-Code"

def check_server(url_to_check, timeout_seconds=3): # Increased timeout to 3 seconds
    """Tries to connect to the server."""
    try:
        urllib.request.urlopen(url_to_check, timeout=timeout_seconds)
        return True
    except (URLError, ConnectionRefusedError, ConnectionResetError, socket.timeout): # Added socket.timeout
        return False

try:
    # Start the npm run dev command as a background process
    print(f"Starting '{command}' in {project_dir}...")
    # Use shell=True for Windows to correctly interpret 'npm'
    # Use creationflags to detach the process so it continues running after the script exits
    process = subprocess.Popen(command, shell=True, cwd=project_dir, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    print(f"'{command}' started with PID: {process.pid}")

    # Wait for the server to start by polling
    max_wait_time = 30  # seconds
    poll_interval = 0.5 # seconds
    elapsed_time = 0

    print(f"Waiting for the server at {url} to respond (max {max_wait_time}s)...")
    while elapsed_time < max_wait_time:
        if check_server(url):
            print(f"Server is up! Responded in {elapsed_time:.2f} seconds.")
            break
        time.sleep(poll_interval)
        elapsed_time += poll_interval
        print(f"Still waiting... ({elapsed_time:.1f}s / {max_wait_time}s)", end='\r')
    else:
        print(f"\nServer did not respond within {max_wait_time} seconds. Proceeding to open browser anyway.")

    # Open the URL in the default web browser
    print(f"Opening {url} in the browser...")
    webbrowser.open(url)
    print("Browser launch command sent.")

    print("Script finished. The dev server should be running in the background.")

except FileNotFoundError:
    print(f"Error: The command '{command}' was not found. Make sure Node.js and npm are installed and in your PATH.")
    print(f"Attempted to run in directory: {project_dir}")
except Exception as e:
    print(f"An error occurred: {e}") 