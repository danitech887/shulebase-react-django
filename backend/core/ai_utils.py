import os
import json
from google import genai
from google.genai import types
from django.conf import settings

def extract_strands_from_file(file_obj, subject):
    """
    Uses Gemini (google-genai) to extract strands and sub-strands from a rubric file.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    print(f"DEBUG: GEMINI_API_KEY loaded: {'Yes (starts with ' + api_key[:4] + ')' if api_key else 'No'}")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables. Please add it to your .env file and restart the server.")

    client = genai.Client(api_key=api_key)
    
    # Read file content
    file_data = file_obj.read()
    mime_type = file_obj.content_type

    prompt = f"""
    You are an expert curriculum assistant for the CBC (Competency Based Curriculum).
    Extract the Strands and their corresponding Sub-strands (topics) from the attached rubric for the subject: {subject}.
    
    Return the data ONLY as a JSON array of objects, with this structure:
    [
      {{
        "strand": "Strand Name",
        "description": "Optional description",
        "sub_strands": [
          {{ 
            "name": "Sub-strand Name", 
            "expected_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
          }}
        ]
      }}
    ]
    
    Ensure the extraction is accurate and follows the document's hierarchy.
    If the document contains multiple strands, include all of them.
    Do not include any introductory or concluding text, only the JSON.
    """

    try:
        # Use the correct google-genai syntax for parts
        content = [
            prompt,
            types.Part.from_bytes(data=file_data, mime_type=mime_type)
        ]

        # Use gemini-flash-latest based on the list of models available to this account
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=content
        )
        
        text = response.text
        # Extract JSON from response text (handle potential markdown blocks)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        return json.loads(text)
    except Exception as e:
        import traceback
        print("--- RUBRIC EXTRACTION ERROR ---")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        traceback.print_exc()
        print("-------------------------------")
        raise e

def extract_teaching_progress_from_file(file_obj, subject):
    """
    Uses Gemini to extract teaching progress (topics taught) from a record of work or lesson plan.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found.")

    client = genai.Client(api_key=api_key)
    file_data = file_obj.read()
    mime_type = file_obj.content_type

    prompt = f"""
    You are an expert curriculum assistant. 
    Extract the list of topics and sub-topics taught from the attached Record of Work for the subject: {subject}.
    
    Return the data ONLY as a JSON array of objects, with this structure:
    [
      {{
        "topic": "Topic Name",
        "sub_topic": "Sub-topic Name",
        "date_of_teaching": "YYYY-MM-DD",
        "status": "Completed" or "Ongoing"
      }}
    ]
    
    If the date is missing, use the current date or leave it null.
    Default the status to "Completed" unless it explicitly says it's in progress.
    Do not include any introductory text, only the JSON.
    """

    try:
        content = [
            prompt,
            types.Part.from_bytes(data=file_data, mime_type=mime_type)
        ]

        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=content
        )
        
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        return json.loads(text)
    except Exception as e:
        print(f"Progress Extraction AI Error: {e}")
        return []
