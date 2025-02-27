from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core import SimpleDirectoryReader
from llama_index.core.indices.document_summary import DocumentSummaryIndex
from llama_index.core.response_synthesizers import TreeSummarize
from llama_index.llms.openai import OpenAI
from llama_index.core.node_parser import SentenceSplitter
# Function to load the PDF file
openai = OpenAI(model='gpt-3.5-turbo',api_key='your_api_key')
splitter = SentenceSplitter(chunk_size = 2000)
def load_file(file_path):
    print("file_path===========>", file_path)
    loader = SimpleDirectoryReader(input_files=[file_path])
    documents = loader.load_data()
    print("documents=================>", documents)
    return documents


# Create documents summery index
def create_summary_index(documents):
    response_synthesizer = get_response_synthesizer(response_mode="tree_summarize", use_async=True)
    print("response_synthesizer=================>",response_synthesizer)
    #Create document summary index
    doc_summary_index = DocumentSummaryIndex.from_documents(
        documents,
        llm=openai,
        transformation=[splitter],
        response_synthesizer=response_synthesizer,
        show_progress=True,
    )
    return doc_summary_index


# Function to summarize the index using LlamaIndex
def summarize(doc_summary_index):
    query_engine = doc_summary_index.as_query_engine(
        response_mode="tree_summarize", use_async=True)
    response = query_engine.query("Please summarize the content.")
    print("response=============>",response)
    # Simulate streaming by printing intermediate results
    return response.response_gen
