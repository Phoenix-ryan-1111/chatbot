from flask import Flask, request, jsonify
import openai
import nltk
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

# Download NLTK data files (only the first time)
nltk.download('punkt')

app = Flask(__name__)
CORS(app, supports_credentials=True)

#openai_key
openai.api_key = 'your-api-key'

#debugging on
# app.config['DEBUG'] = True

#Create the uploads directory if it doesn't exist
UPLOAD_FOLDER = 'upload'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/api/chat', methods=['POST'])
def chat():
    user_input = ""
    file_content = ""
    print(request.form)
    if request.content_type.startswith('multipart/form-data'):
        #get text message
        if 'message' in request.form:
            user_input = request.form['message']
            print("00=========>", user_input)
        #handle file upload
        if 'file' in request.files:
            file = request.files['file']
        if file.filename == '':
            return jsionify({'error': 'No selected file'}), 400
        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
    #Process files
    else:
        data = request.get_json()
        user_input = data.get('message', '')

    #combine msg and file content
    if file_content:
        user_input = f"{user_input}\nFile content:\n{file_content}"

    # tokens = nltk.word_tokenize(user_input.lower())  # Tokenization (optional)

    # Get response from OpenAI API
    def generate():
        response = openai.chat.completions.create(model="gpt-3.5-turbo",
                                                  messages=[{
                                                      "role":
                                                      "user",
                                                      "content":
                                                      user_input
                                                  }],
                                                  stream=True)
        for chunk in response:
            if chunk.choices[0].delta.content is not None:
                print("answer===========>", chunk.choices[0].delta.content)
                yield chunk.choices[0].delta.content.replace("\n", "<br/>")

    return generate(), {"Content-Type": "text/plain"}


if __name__ == '__main__':
    app.run(port=5000)
