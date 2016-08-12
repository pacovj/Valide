# coding=utf-8
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from cgi import parse_header, parse_multipart
from urlparse import parse_qs
import sqlite3
import SimpleHTTPServer
import SocketServer
import subprocess
import json
import time
import xml.etree.ElementTree as ET

articulos={"ms":["un","el","ese","este","aquel","algún","ningún"],
	"mp":["unos","los","esos","estos","aquellos","algunos","ningunos"],
	"fs":["una","la","esa","esta","aquella","alguna","ninguna"],
	"fp":["unas","las","esas","estas","aquellas","algunas","ningunas"]};

keepWorking=True
conn = sqlite3.connect('valide.db3')
timeout=None
dumps={}

class myRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):    
	def do_GET(self):
		global timeout
		timeout=None
		SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

	def getVars(self):
		ctype, pdict = parse_header(self.headers['content-type'])
		if ctype == 'multipart/form-data':
			postvars = parse_multipart(self.rfile, pdict)
		elif ctype == 'application/x-www-form-urlencoded':
			length = int(self.headers['content-length'])
			postvars = parse_qs(self.rfile.read(length),keep_blank_values=1)
		else:
			postvars = {}
		return postvars

	def do_POST(self):
		global httpd
		global timeout
		# Doesn't do anything with posted data
		self.send_response(200)
		self.send_header('Content-type', 'text/html')
		self.end_headers()
		if self.path=="/shutdown":
			self.wfile.write("Ok!")
			timeout=2
		if self.path=="/loadPaises":
			dumpTable("Paises",self)
		if self.path=="/loadUsos":
			dumpTable("Usos",self)
		if self.path=="/analiza":
			analiza(self)
		if self.path=="/cambia":
			cambia(self)

def isHit(colocacion,ngram):
	toks=colocacion.split(" ")
	if len(ngram)<len(toks):
		return False
	for i in range(0,len(toks)):
		if not toks[i] in ngram[i]:
			return False
	return True

def wordMe(paragraph):
	words=[]
	separators=[]
	word=''
	for c in paragraph:
		if isWhiteSpace(c):
			if word!='':
				words.append(word)
			word=''
		elif isSeparator(c):
			if word!='':
				words.append(word)
			separators.append([c,len(words)])
			word=''
		else:
			word+=c
	if word!='':
		words.append(word)
	return (words,separators)

def getTextoTag(parrafos,hits):
	pidx=0
	texto=""
	ps=parrafos[:]
	hs=hits[:]
	hidx=0
	while len(hs)>0:
		while pidx<hs[0]["pidx"]:
			texto+="<p>"+ps[0]+"</p>"
			pidx+=1
			del ps[0]
		cparrafo=ps[0]
		del ps[0]
		(words,separators)=wordMe(cparrafo)
		cparrafo="<p>"
		needSpace=False
		ppi=hs[0]["ppi"]
		longitud=len(wordMe(hs[0]["texto"])[0])
		print words
		print separators
		print ppi
		print longitud
		closeSpan=False
		for i in range(0,len(words)):
			if i==ppi+longitud:
				cparrafo+="</span>"
				del hs[0]
				hidx+=1
				closeSpan=False
				if len(hs)>0:
					ppi=hs[0]["ppi"]
			if i==ppi:
				if needSpace:
					cparrafo+=" "
				cparrafo+="<span class='thit' id='texto_"+str(hidx)+"'>"
				closeSpan=True
			needSpace=True
			while len(separators)>0 and separators[0][1]==i:
				cparrafo+=separators[0][0]
				del separators[0]
			if needSpace and i!=ppi:
				cparrafo+=" "
			cparrafo+=words[i]
		if closeSpan:
			cparrafo+="</span>"
			del hs[0]
			hidx+=1
		while len(separators)>0:
			cparrafo+=separators[0][0]
			del separators[0]
		cparrafo+="</p>"
		print cparrafo
	texto+=cparrafo
	for p in ps:
		texto+="<p>"+p+"</p>"
	return texto

def cambia(request):
	vars=request.getVars()
	texto=""
	parrafo=vars['text'][0]
	sinonimo=vars["sinonimo"][0]
	sgenero=vars["singen"][0]
	spos=vars["sinpos"][0]
	original=vars["original"][0]
	ppi=int(vars["ppi"][0])
	(words,separators)=wordMe(parrafo)
	(owords,oseparators)=wordMe(original)
	#Buscar el articulo
	genero=""
	numero=""
	articulo=-1
	ppia=-1
	isTitle=False;
	longitud=len(owords);
	for i in range(1,3):
		if (ppi-i>=0) and words[ppi-i].lower() in articulos['ms']:
			isTitle=words[ppi-i].lower()!=words[ppi-i]
			genero="masculino"
			numero="s"
			ppia=ppi-i
			articulo=articulos['ms'].index(words[ppi-i].lower())
			break
		if (ppi-i>=0) and words[ppi-i].lower() in articulos['mp']:
			isTitle=words[ppi-i].lower()!=words[ppi-i]
			genero="masculino"
			numero="p"
			ppia=ppi-i
			articulo=articulos['mp'].index(words[ppi-i].lower())
			break
		if (ppi-i>=0) and words[ppi-i] in articulos['fs']:
			isTitle=words[ppi-i].lower()!=words[ppi-i]
			genero="femenino"
			numero="s"
			ppia=ppi-i
			articulo=articulos['fs'].index(words[ppi-i].lower())
			break
		if (ppi-i>=0) and words[ppi-i] in articulos['fp']:
			isTitle=words[ppi-i].lower()!=words[ppi-i]
			genero="femenino"
			numero="plural"
			ppia=ppi-i
			articulo=articulos['fp'].index(words[ppi-i].lower())
			break
	print articulo
	print isTitle
	print genero
	print numero
	print words
	print separators
	#reemplazar el original por sinonimo
	texto=''
	replace=True
	#Obtener la conjugacion del original
	obases=getCompleteBases(original)
	x=0
	while x!=len(obases):
		if obases[x][2][0]=='N' and spos=='sustantivo' or obases[x][2][0]=='V' and spos=='verbo':
			x+=1
		else:
			del obases[x]
	print obases
	conjugado= obases[0][0]!=original
	print conjugado
	print ppi
	for i in range(0,len(words)):
		while len(separators)>0 and separators[0][1]==i:
			texto+=separators[0][0]
			del separators[0]
		if i==ppia and conjugado and articulo>-1:
			texto+=articulos[obases[0][2][3].lower()+obases[0][2][4].lower()][articulo]
		else:
			if i>=ppi and i<ppi+longitud:
				if replace:
					tt=sinonimo
					if len(obases)>0:
						s=getNewBases(sinonimo,obases[0])
						if s!="":
							tt=s
					if texto!="":
						texto+=" "
					texto+=tt
					replace=False
			else:
				if texto!="":
					texto+=" "
				texto+=words[i]
	while len(separators)>0:
		texto+=separators[0][0]
		del separators[0]
	print texto
	print clean(texto)
	request.wfile.write(json.dumps({"texto":clean(texto)}))

def analiza(request):
	vars=request.getVars()
	#Parsear texto
	paragraphs=paragraphMe(vars['text'][0])
	chunks=chunkMe(paragraphs)
	morphs=morphMe(chunks)
	#Buscar variantes lexicas
	hits=lexMe(morphs,paragraphs)
	hits=pruneHits(hits,vars['Paises'][0],vars['Usos'][0])
	hits=extractConceptos(hits)
	request.wfile.write(clean(json.dumps({"hits":hits,"parrafos":paragraphs,"tag":getTextoTag(paragraphs,hits)})))

def getIndexArray(nombres,tabla):
	v=[]
	for nombre in nombres:
		i=0
		for r in dumps[tabla]:
			if r[0]==nombre:
				v.append(i)
				break
			i+=1
	return v

def extractConceptos(hits):
	c = conn.cursor()
	for hit in hits:
		usosTotales=[]
		paisesTotales=[]
		conceptosTotales=[]
		#Necesito los sinonimos aqui
		sinonimos=[]
		
		for variante in hit["variantes"]:
			rows=c.execute("select * from variantes where concepto='"+variante[2]+"' and pais='"+variante[1]+"';").fetchall()
			sinonimos.extend(rows);
			if not variante[3] in usosTotales:
				usosTotales.append(variante[3])
			if not variante[1] in paisesTotales:
				paisesTotales.append(variante[1])
		detalles=[]
		for pais in paisesTotales:
			usosPais=[]
			conceptosPais=[]
			variantesPais=[]
			detalle={}
			for variante in hit["variantes"]:
				if variante[1]==pais:
					if not variante[3] in usosPais:
						usosPais.append(variante[3])
					if not variante[2] in conceptosPais:
						conceptosPais.append(variante[2])
					variantesPais.append(variante)
			conceptos=[]
			for concepto in conceptosPais:
				rows=c.execute("select * from conceptos where nombre='"+concepto+"';").fetchall()
				conceptos.append(rows[0]);
				if not rows[0] in conceptosTotales:
					conceptosTotales.append(rows[0])
			detalle["usos"]=getIndexArray(usosPais,"Usos")
			detalle["pais"]=pais
			detalle["variantes"]=variantesPais
			detalle["conceptos"]=conceptos
			detalles.append(detalle)
		hit["usos"]=getIndexArray(usosTotales,"Usos")
		hit["paises"]=getIndexArray(paisesTotales,"Paises")
		hit["detalles"]=detalles
		hit["conceptos"]=conceptosTotales
		hit["sinonimos"]=sinonimos
	#Los resultados se mostraran hit usos boton de expandir
	#Cada hit vendra por pais concepto uso dispersion y otros datos y un boton de reemplazar con sinonimo
	return hits

def pruneHits(hits,paises,usos):
	selPaises=[]
	for pais in paises.split(","):
		selPaises.append(dumps['Paises'][int(pais)][0])
	selUsos=[]
	for uso in usos.split(","):
		selUsos.append(dumps['Usos'][int(uso)][0])
	nhits=[]
	for hit in hits:
		i=0
		while i<len(hit["variantes"]):
			if hit["variantes"][i][1] in selPaises and hit["variantes"][i][3] in selUsos:
				i+=1
			else:
				del hit["variantes"][i]
		if len(hit["variantes"])>0:
			nhits.append(hit)
	return nhits

def lexMe(morphs,paragraphs):
	hits=[]
	for pidx in range(0,len(morphs)):
		ppi=0
		for cidx in range(0,len(morphs[pidx])):#un parrafo tiene chunks que pueden formar n-gramas
			chunk=morphs[pidx][cidx]
			#buscar coincidencias lexicas
			#los chunks pueden formar n-gramas
			c = conn.cursor()
			i=0
			while i <len(chunk):
				condition=getConditionString("PrimerLemma",chunk[i])
				sq="select * from Colocaciones where "+condition+" and palabras<="+str(len(chunk))+";"
				rows=c.execute(sq).fetchall()
				variante=''
				original=''
				offset=0
				if len(rows)>0:#tiene colocaciones. Siempre se le da preferencia a las colocaciones
					for r in rows:
						if isHit(r[0],chunk[i:i+r[1]]):
							variante="texto='"+r[0]+"'"
							for j in range(0,r[1]):
								if original!='':
									original+=' '
								original+=chunk[i+j][0]
							print "hit"
							i+=r[1]
							offset=r[1]
							break
				if variante=='':#busca variantes usando una palabra
					for morph in chunk[i]:
						if variante!='':
							variante+=' or '
						variante+="texto = '"+morph+"'"
					original=chunk[i][0]
					i+=1
					offset=1
				sq="select * from Variantes where "+variante+";"
				rows=c.execute(sq).fetchall()
				if len(rows)>0:
					hits.append({'texto':original,'variantes':rows,'parrafo':paragraphs[pidx],'ppi':ppi,'pidx':pidx})
				ppi+=offset
	return hits

def getConditionString(field,bases):
	t=''
	w=0
	for base in bases:
		if w>0:
			t+=' or '
		t+=field+"='"+base+"'"
		w+=1
	return t

def getText(node):
	t=cleanMe(node.text)
	for child in node:
		t+=getTags(child)
	t+=cleanMe(node.tail)
	return t

def paragraphMe(html):
	paragraphs=[]
	print html
	root = ET.fromstring(html)
	for child in root:
		paragraphs.append(getText(child))
	return paragraphs

def isWhiteSpace(c):
	return c==' '

def isSeparator(c):
	return c=='\t' or c=='\n' or c=='\r' or c==',' or c=='.' or c==';' or c==':' or c=='-' or c=='?' or c=='?' or c==')' or c=='(' or c=='/' or c=='"' or c=='!' or c=='|' or c=='+' or c==']' or c=='[' or c=='{' or c=='}' or c=='<' or c=='>' or c==u'¿' or c==u'¡' 

def getBases(word):
	bases=[]
	bases.append(word)
	c = conn.cursor()
	rows=c.execute("select baseForm from morph where morph='"+word.lower()+"';").fetchall()
	for r in rows:
		if not r[0] in bases:
			bases.append(r[0])
	return bases

def getNewBases(sinonimo,base):
	c = conn.cursor()
	rows=c.execute("select * from morph where tag='"+base[2]+"' and baseForm='"+sinonimo+"';").fetchall()
	if len(rows)>0:
		return rows[0][0]
	else:
		return ""

def getCompleteBases(word):
	c = conn.cursor()
	rows=c.execute("select * from morph where morph='"+word.lower()+"';").fetchall()
	return rows

def morphMe(chunks):
	o=[]
	for paragraph in chunks:
		p=[]
		for chunk in paragraph:
			c=[]
			for word in chunk:
				w=getBases(word)
				c.append(w)
			p.append(c)
		o.append(p)
	return o

def chunkMe(paragraphs):
	chunks=[]
	for paragraph in paragraphs:
		p=[]
		chunk=[]
		word=''
		for c in paragraph:
			if isWhiteSpace(c):
				if word!='':
					chunk.append(word)
				word=''
			elif isSeparator(c):
				if word!='':
					chunk.append(word)
				word=''
				if len(chunk)>0:
					p.append(chunk)
				chunk=[]
			else:
				word+=c
		if word!='':
			chunk.append(word)
		if len(chunk)>0:
			p.append(chunk)
		chunks.append(p)
	return chunks

def cleanMe(texto):
	if texto!=None:
		haveUnicode=0
		out=''
		code=''
		for c in texto:
			if c=='|':
				haveUnicode=1
			else:
				if c=='u' and haveUnicode==1:
					haveUnicode=2
				else:
					if haveUnicode==1:
						out+='|'
						haveUnicode=0
					if haveUnicode>=2:
						if c==";":
							out+=unichr(int(code))
							haveUnicode=0;
							code=''
						else:
							code+=c
					else:
						out+=c
		return out
	else:
		return ''


def clean(string):
	haveUnicode=0
	out=''
	for c in string:
		if c=='\\':
			haveUnicode=1
		else:
			if c=='u' and haveUnicode==1:
				out+="&#x"
				haveUnicode=2
			else:
				if haveUnicode==1:
					out+='\\'
					haveUnicode=0
				out+=c
				if haveUnicode>=2:
					haveUnicode+=1
					if haveUnicode==6:
						out+=';'
						haveUnicode=0
	return out

def dumpTable(table,handler):
	global dumps
	c = conn.cursor()
	rows=c.execute("select * from "+table+";").fetchall()
	dumps[table]=rows;
	handler.wfile.write(clean(json.dumps(rows)))

class myServer(SocketServer.TCPServer):
	def handle_timeout(self):
		global keepWorking
		keepWorking=False

if __name__ == "__main__":
	print 'Starting httpd...'
	httpd = myServer(('127.0.0.1', 10683), myRequestHandler)
	time.sleep(1)
	op=subprocess.Popen(["cmd","/c","start","http://127.0.0.1:10683"])
	while keepWorking:
		httpd.handle_request()
		httpd.timeout=timeout