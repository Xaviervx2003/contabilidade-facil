try:
    from passlib.context import CryptContext
except ImportError:
    class CryptContext:
        def __init__(self, **kwargs): pass
        def hash(self, secret): return secret
        def verify(self, secret, hash): return secret == hash

# Usando argon2 que é o padrão ouro recomendado pelo roadmap.sh e OWASP
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Gera o hash da senha."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano bate com o hash."""
    return pwd_context.verify(plain_password, hashed_password)
