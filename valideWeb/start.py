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

def isHit(colocacion,ngram):
	toks=colocacion.split(" ")
	if len(ngram)<len(toks):
		return False
	for i in range(0,len(toks)):
		if not toks[i] in ngram[i]:
			return False
	return True

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
	print hits
	request.wfile.write(clean(json.dumps(hits)))

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
		for variante in hit["variantes"]:
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
		hit["pais"]=getIndexArray(paisesTotales,"Paises")
		hit["detalles"]=detalles
		hit["conceptos"]=conceptosTotales
		del hit["variantes"]
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

def paragraphMe(html):
	paragraphs=[]
	root = ET.fromstring(html)
	for child in root:
		paragraphs.append(getText(child))
	chunks=chunkMe(paragraphs)
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

def getText(node):
	t=cleanMe(node.text)
	for child in node:
		t+=getText(child)
	t+=cleanMe(node.tail)
	return t

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