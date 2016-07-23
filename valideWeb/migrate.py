import sqlite3
import hashlib
import base64

if __name__ == '__main__':
	old='C:/Users/Francisco/Documents/Embarcadero/Studio/Projects/ValidePC_Beta/Win32/Debug/dbs/ValideANA.db3'
	input = sqlite3.connect(old)
	inc = input.cursor()
	output = sqlite3.connect('valide.db3')
	outc=output.cursor()
	#migrar paises

	inr=inc.execute('select * from ctlPAIS;').fetchall()
	outr=outc.execute('select * from Paises;').fetchall()
	if len(outr)==0:
		for row in inr:
			print row
			outc.execute("insert into Paises values('"+row[1]+"',"+str(row[2])+");")
		output.commit()
	#migrar morph

	inr=inc.execute('select * from MORPH;').fetchall()
	outr=outc.execute('select * from Morph;').fetchall()
	if len(outr)==0:
		for row in inr:
			print row
			outc.execute("insert into Morph values('"+row[1]+"','"+row[0]+"','"+row[2]+"');")
		output.commit()
	#Usos
	inr=inc.execute('select * from ctlUso;').fetchall()
	outr=outc.execute('select * from Usos;').fetchall()
	if len(outr)==0:
		for row in inr:
			print row
			outc.execute("insert into Usos values('"+row[1]+"','N/A','"+row[3]+"');")
		output.commit()
	#Colocaciones
	inr=inc.execute('select * from VARIANTE where PALABRAS>1;').fetchall()
	outr=outc.execute('select * from Colocaciones;').fetchall()
	if len(outr)==0:
		for row in inr:
			print row
			outc.execute("insert into Colocaciones values('"+row[3]+"','"+str(row[5])+"','"+row[7]+"');")
		output.commit()
	#Conceptos
	
	inr=inc.execute('select * from CONCEPTO;').fetchall()
	outr=outc.execute('select * from Conceptos;').fetchall()
	if len(outr)==0:
		f=open('ref.jpg','r')
		ref=f.read()
		f.close()
		for row in inr:
			m=hashlib.md5()
			m.update(row[2].encode('utf-8'))
			g=row[4]
			if row[4]==None:
				g='No disponible'
			
			
			t=base64.b64decode(row[5])
			if t!=ref:
				i='pics/'+m.hexdigest()+".jpg"
				f=open(i,'wb')
				f.write(t)
				f.close()
			else:
				i='ref.jpg'
			sq="insert into Conceptos values('"+row[2].replace("'","''")+"','"+row[3].replace("'","''")+"','"+g+"','"+i+"');"
			print sq
			outc.execute(sq)
		output.commit()
	#Variantes
	inr=inc.execute('select v.variante,p.Pais,c.Concepto,u.Uso,g.Genero,cl.Clase,vp.Nivel,vp.Nota,vp.Ejemplo,v.Dispersion from variante as v,var_pais as vp,ctlPAIS as p,concepto as c, ctlUSO as u,ctlGENERO as g, ctlCLASE as cl where v.Clave_Variante=vp.Clave_Variante and p.Clave_Pais=vp.Clave_Pais and v.Clave_Concepto=c.Clave_Concepto and vp.Clave_Uso=u.Clave_Uso and v.Clave_Genero=g.Clave_Genero and c.Clave_Clase=cl.Clave_Clase;').fetchall()
	outr=outc.execute('select * from Variantes;').fetchall()
	if len(outr)==0:
		for row in inr:
			n=row[7]
			if row[7]==None:
				n=''
			e=row[8]
			if row[8]==None:
				e='No disponible'

			if row[9]==None:
				d='null'
			else:
				d=str(row[9])
			#texto,pais,concepto,uso,genero,pos,nivel,nota,ejemplo,dispersion
			sq="insert into Variantes values('"+row[0]+"','"+row[1]+"','"+row[2]+"','"+row[3]+"','"+row[4]+"','"+row[5]+"',"+str(row[6])+",'"+n+"','"+e+"',"+d+");"
			print sq
			outc.execute(sq)
		output.commit()
	input.close()
	output.close()