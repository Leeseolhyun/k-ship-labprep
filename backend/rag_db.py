import os

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 주의: 경로에 한글 등 비-ASCII 문자가 있으면 chromadb의 HNSW 인덱스가 깨지는 버그가 있어 영문 경로만 사용
TXT_FOLDER_PATH = os.environ.get("SHIP_TXT_FOLDER_PATH", r"C:\Users\김민성\Desktop\last\texts")
DB_PERSIST_PATH = os.environ.get("SHIP_CHROMA_DB_PATH", r"C:\chroma_data\ship_chroma_db")
COLLECTION_NAME = "ship_rules"

_collection = None


def get_collection():
    """규정 텍스트 벡터 DB를 최초 1회 빌드하고, 이후에는 캐시된 컬렉션을 반환한다."""
    global _collection
    if _collection is not None:
        return _collection

    chroma_client = chromadb.PersistentClient(path=DB_PERSIST_PATH)
    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    if collection.count() == 0:
        _build_collection(collection)

    _collection = collection
    return collection


def _build_collection(collection):
    if not os.path.exists(TXT_FOLDER_PATH):
        raise FileNotFoundError(f"텍스트 폴더를 찾을 수 없습니다: {TXT_FOLDER_PATH}")

    combined_text = ""
    for filename in os.listdir(TXT_FOLDER_PATH):
        if filename.lower().endswith(".txt"):
            file_path = os.path.join(TXT_FOLDER_PATH, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                combined_text += f"\n\n[출처: {filename}]\n"
                combined_text += f.read()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=100, length_function=len
    )
    chunks = text_splitter.split_text(combined_text)

    batch_size = 1000
    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i : i + batch_size]
        batch_ids = [str(i + j) for j in range(len(batch_chunks))]
        collection.add(documents=batch_chunks, ids=batch_ids)


def retrieve_context(query: str, n_results: int = 5) -> str:
    """질의어로 관련 규정 텍스트 조각을 검색해 하나의 문자열로 합쳐 반환한다."""
    collection = get_collection()
    results = collection.query(query_texts=[query], n_results=n_results)
    documents = results.get("documents")
    if not documents or not documents[0]:
        return "관련 데이터 없음"
    return "\n".join(documents[0])
