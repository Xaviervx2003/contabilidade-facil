import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import iniciar_pool, get_conexao
iniciar_pool()
with get_conexao() as c:
    cur = c.cursor()
    cur.execute("SELECT COUNT(*) FROM materias WHERE parent_id NOT IN (SELECT id FROM materias WHERE parent_id IS NULL) AND parent_id IS NOT NULL")
    print("Nodes deeper than level 2:", cur.fetchone()[0])
