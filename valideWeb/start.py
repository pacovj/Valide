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
import base64
import hashlib
import random

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
		if self.path=="/searchConcepto":
			conceptos(self)
		if self.path=="/nuevoConcepto":
			nuevoConcepto(self)
		if self.path=="/borraConcepto":
			borraConcepto(self)
		if self.path=="/salvaConcepto":
			cambiaConcepto(self)
		if self.path=="/dameVariantes":
			dameVariantes(self)
		if self.path=="/createVariante":
			createVariante(self)
		if self.path=="/updateVariante":
			updateVariante(self)
		if self.path=="/borraVariante":
			borraVariante(self)

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
	hidx=0
	for parrafo in parrafos:
		cparrafo=""
		(words,separators)=wordMe(parrafo)
		sidx=0
		for i in range(0,len(words)):
			if hidx<len(hits) and hits[hidx]["pidx"]==pidx:
				longitud=len(wordMe(hits[hidx]["texto"])[0])
				if i==hits[hidx]["ppi"]+longitud:
					cparrafo+="</span>"
					hidx+=1
			if sidx<len(separators) and separators[sidx][1]==i:
				cparrafo+=separators[sidx][0]
				sidx+=1
			if i>0:
				cparrafo+=" "
			if hidx<len(hits) and hits[hidx]["pidx"]==pidx:
				if i==hits[hidx]["ppi"]:
					cparrafo+="<span class='thit' id='texto_"+str(hidx)+"' onclick='clickMe("+str(hidx)+")'>"
			cparrafo+=words[i]
		if cparrafo=="":
			texto+="<p>"+parrafo+"</p>"
		else:
			texto+="<p>"+cparrafo+"</p>"
		pidx+=1
	return texto

def conceptos(request):
	vars=request.getVars()
	target=vars["texto"][0]
	c=conn.cursor()
	rows=c.execute("select * from conceptos where nombre like '"+target+"%' or nombre='"+target+"'").fetchall()
	request.wfile.write(clean(json.dumps({"conceptos":rows})))

def cambia(request):
	vars=request.getVars()
	texto=""
	parrafo=cleanMe(vars['text'][0])
	sinonimo=vars["sinonimo"][0]
	spos=vars["sinpos"][0]
	original=vars["original"][0]
	ppi=int(vars["ppi"][0])
	print "Cambiando"
	(words,separators)=wordMe(parrafo)
	print parrafo
	(owords,oseparators)=wordMe(original)
	#Buscar el articulo
	#reemplazar el original por sinonimo
	texto=''
	#Obtener la conjugacion del original
	obases=getCompleteBases(original,spos)
	target=getNewBases(sinonimo,obases[0])
	print obases
	if target=="":
		target=sinonimo
	if original[0].isupper():
		target=target.capitalize()
	longitud=len(owords)
	print target
	i=0
	while i<len(words):
		while len(separators)>0 and separators[0][1]==i:
			texto+=separators[0][0]
			del separators[0]
		j=0
		count=0
		if i>0:
			texto+=" "
		while j<longitud and (i+j)<len(words):
			if words[i+j].lower()==owords[j].lower():
				count+=1
			j+=1
		if count>=longitud:
			texto+=target
		else:
			texto+=words[i]
		i+=1
	while len(separators)>0:
		texto+=separators[0][0]
		del separators[0]
	print "exito"
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
							variante="texto='"+r[0].replace("'","''")+"'"
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
						variante+="texto = '"+morph.replace("'","''")+"'"
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
		t+=field+"='"+base.replace("'","''")+"'"
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
	rows=c.execute("select baseForm from morph where morph='"+word.lower().replace("'","''")+"';").fetchall()
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

def getCompleteBases(word,spos):
	c = conn.cursor()
	pos='%'
	if spos=="sustantivo":
		pos='N%'
	if spos=="verbo":
		pos='V%'
	rows=c.execute("select * from morph where morph='"+word.lower()+"' and tag like '"+pos+"' ;").fetchall()
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

def savePic(base,name):
	t=base64.b64decode(base)
	i=name
	f=open(i,'wb')
	f.write(t)
	f.close()

def nuevoConcepto(request):
	vars=request.getVars()
	target=vars["pic"][0]
	nombre=cleanMe(vars["nombre"][0])
	lengua=cleanMe(vars["lengua"][0])
	definicion=cleanMe(vars["definicion"][0])
	if len(definicion)<1:
		definicion="No disponible"
	target=vars["pic"][0]
	name=target
	if target!="ref.jpg":
		m=hashlib.md5()
		m.update(nombre)
		name='./pics/'+m.hexdigest()+".jpg"
		savePic(target,name)
	c=conn.cursor()
	c.execute("insert into Conceptos values('"+nombre+"','"+lengua+"','"+definicion+"','"+name+"')")
	conn.commit()
	request.wfile.write(clean(json.dumps({"done":"ok"})))

def borraConcepto(request):
	vars=request.getVars()
	nombre=cleanMe(vars["nombre"][0])
	c=conn.cursor()
	c.execute("delete from Variantes where concepto='"+nombre+"';")
	c.execute("delete from Conceptos where nombre='"+nombre+"';")
	conn.commit()
	request.wfile.write(clean(json.dumps({"done":"ok"})))

def cambiaConcepto(request):
	vars=request.getVars()
	target=vars["pic"][0]
	nombre=cleanMe(vars["nombre"][0])
	original=cleanMe(vars["original"][0])
	lengua=cleanMe(vars["lengua"][0])
	definicion=cleanMe(vars["definicion"][0])
	if len(definicion)<1:
		definicion="No disponible"
	target=vars["pic"][0]
	print vars["nuevaPic"][0]
	replacePic=vars["nuevaPic"][0]=="true"
	name=target
	if replacePic:
		m=hashlib.md5()
		m.update(nombre)
		name='./pics/'+m.hexdigest()+"_"+str(random.randint(0,1000))+".jpg"
		savePic(target,name)
		print "Archivo guardado"
	c=conn.cursor()
	print "update Variantes set concepto='"+nombre+"' where concepto='"+original+"'"
	print "update Conceptos set nombre='"+nombre+"',lenguaControl='"+lengua+"',glosa='"+definicion+"',imagen='"+name+"' where nombre='"+original+"'"
	c.execute("update Variantes set concepto='"+nombre+"' where concepto='"+original+"'")
	c.execute("update Conceptos set nombre='"+nombre+"',lenguaControl='"+lengua+"',glosa='"+definicion+"',imagen='"+name+"' where nombre='"+original+"'")
	conn.commit()
	request.wfile.write(clean(json.dumps({"done":"ok"})))

def dameVariantes(request):
	vars=request.getVars()
	concepto=cleanMe(vars["nombre"][0])
	c=conn.cursor()
	print "select * from variantes where concepto='"+concepto+"';"
	rows=c.execute("select * from variantes where concepto='"+concepto+"' order by pais;").fetchall()
	conn.commit()
	request.wfile.write(clean(json.dumps({"variantes":rows})))

def createVariante(request):
	vars=request.getVars()
	base=cleanMe(vars["nombre"][0])
	uso=cleanMe(vars["uso"][0])
	concepto=cleanMe(vars["concepto"][0])
	pais=cleanMe(vars["pais"][0])
	genero=cleanMe(vars["genero"][0])
	pos=cleanMe(vars["pos"][0])
	nivel=cleanMe(vars["nivel"][0])
	nota=cleanMe(vars["nota"][0])
	ejemplo=cleanMe(vars["ejemplo"][0])
	dispersion=cleanMe(vars["dispersion"][0])
	c=conn.cursor()
	sq="insert into variantes values('"+base+"','"+pais+"','"+concepto+"','"+uso+"','"+genero+"','"+pos+"',"+nivel+",'"+nota+"','"+ejemplo+"',"+dispersion+")"
	print sq
	rows=c.execute(sq).fetchall()
	conn.commit()
	request.wfile.write(clean(json.dumps({"variantes":rows})))

def updateVariante(request):
	vars=request.getVars()
	base=cleanMe(vars["nombre"][0])
	uso=cleanMe(vars["uso"][0])
	concepto=cleanMe(vars["concepto"][0])
	pais=cleanMe(vars["pais"][0])
	genero=cleanMe(vars["genero"][0])
	pos=cleanMe(vars["pos"][0])
	nivel=cleanMe(vars["nivel"][0])
	nota=cleanMe(vars["nota"][0])
	ejemplo=cleanMe(vars["ejemplo"][0])
	dispersion=cleanMe(vars["dispersion"][0])
	c=conn.cursor()
	sq="update variantes set genero='"+genero+"',pos='"+pos+"',nivel="+nivel+",nota='"+nota+"',ejemplo='"+ejemplo+"',dispersion="+dispersion+" where "
	sq+="texto='"+base+"' and concepto='"+concepto+"' and uso='"+uso+"' and pais='"+pais+"';"
	print sq
	rows=c.execute(sq).fetchall()
	conn.commit()
	request.wfile.write(clean(json.dumps({"variantes":rows})))

def borraVariante(request):
	vars=request.getVars()
	base=cleanMe(vars["nombre"][0])
	uso=cleanMe(vars["uso"][0])
	concepto=cleanMe(vars["concepto"][0])
	c=conn.cursor()
	sq="delete from variantes where "
	sq+="texto='"+base+"' and concepto='"+concepto+"' and uso='"+uso+"';"
	print sq
	rows=c.execute(sq).fetchall()
	conn.commit()
	request.wfile.write(clean(json.dumps({"variantes":rows})))


if __name__ == "__main__":
	print 'Starting httpd...'
	httpd = myServer(('127.0.0.1', 10683), myRequestHandler)
	time.sleep(1)
	op=subprocess.Popen(["cmd","/c","start","http://127.0.0.1:10683"])
	while keepWorking:
		httpd.handle_request()
		httpd.timeout=timeout