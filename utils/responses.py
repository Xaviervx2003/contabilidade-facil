from typing import Any, Optional
from fastapi.responses import JSONResponse

def api_response(sucesso: bool, dados: Any = None, mensagem: Optional[str] = None, status_code: int = 200):
    """
    Padroniza as respostas da API (API Standards - Roadmap.sh).
    Formato: { "sucesso": bool, "dados": any, "mensagem": str }
    """
    content = {
        "sucesso": sucesso,
        "dados": dados,
        "mensagem": mensagem
    }
    # Remove chaves nulas para manter o payload limpo
    if dados is None:
        content.pop("dados")
    if mensagem is None:
        content.pop("mensagem")
        
    return JSONResponse(content=content, status_code=status_code)
