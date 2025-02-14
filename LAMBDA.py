import json
import re
import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

def extract_json_block(text):
    """
    Attempts to find the block between ```json and ``` and return its contents.
    If not found, returns None.
    """
    pattern = r"```json\s*(.*?)\s*```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None

def try_parse_json(text):
    """Attempts to parse the given text as JSON."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None

def lambda_handler(event, context):
    try:
        # 1. Extracting input data
        body_str = event.get("body", "{}")
        body = json.loads(body_str)
        current_words = body.get("current_words", [])
        target_word = body.get("target_word", "")
        
        # Verify that the input data is not empty
        if not current_words or not target_word:
            raise ValueError("Both 'current_words' and 'target_word' must be provided and non-empty.")
        
        # 2. Form the prompt
        # Note: Explicitly request to return only a JSON array without additional explanations.
        prompt_text = (
            f"Given the current words: {' '.join(current_words)}, generate a JSON array of 40 potential next words with their probabilities. "
            f"Ensure that the target word '{target_word}' is included with a probability of 1.0. "
            "Return ONLY the JSON array with no additional text. The array must follow this format:\n"
            "[\n"
            "    {\"word\": \"example1\", \"probability\": 0.9},\n"
            "    {\"word\": \"example2\", \"probability\": 0.8},\n"
            "    ...,\n"
            "    {\"word\": \"example40\", \"probability\": 0.01}\n"
            "]"
        )
        
        # 3. Create the payload using the chat-style format
        request_payload = {
            "inferenceConfig": {
                "max_new_tokens": 2000
            },
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"text": prompt_text}
                    ]
                }
            ]
        }
        
        print("DEBUG: request_payload:", json.dumps(request_payload))
        
        # 4. Call the amazon.nova-micro-v1:0 model
        response = bedrock.invoke_model(
            modelId="amazon.nova-micro-v1:0",  # Replace with your actual Model ID if required
            accept="application/json",
            contentType="application/json",
            body=json.dumps(request_payload)
        )
        
        raw_result = response["body"].read().decode("utf-8")
        print("DEBUG: raw_result:", raw_result)
        
        # 5. Parse the top-level response
        parsed = json.loads(raw_result)
        
        # Extract content from the "text" field
        candidate_text = parsed["output"]["message"]["content"][0]["text"]
        print("DEBUG: candidate_text:", candidate_text)
        
        # 6. Attempt to extract a JSON block from the candidate_text
        json_block = extract_json_block(candidate_text)
        if json_block:
            generated_words = try_parse_json(json_block)
        else:
            # If no block is found, try parsing the entire candidate_text as JSON
            generated_words = try_parse_json(candidate_text)
        
        if generated_words is None:
            raise ValueError("Failed to parse JSON from model response.")
        
        # 7. Ensure that the result is a list
        if not isinstance(generated_words, list):
            raise ValueError(f"Expected list of objects, got {type(generated_words)} => {generated_words}")
        
        # 8. If the target_word is missing, add it
        if target_word not in [w.get("word") for w in generated_words]:
            generated_words.append({"word": target_word, "probability": 1.0})
        
        # 9. Sort candidates by probability and take the top 40
        sorted_candidates = sorted(generated_words, key=lambda x: x.get("probability", 0), reverse=True)[:40]
        
        result = {
            "current_words": current_words,
            "next_candidates": sorted_candidates
        }
        
        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        }
    
    except Exception as e:
        print("Error in Lambda:", str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        }