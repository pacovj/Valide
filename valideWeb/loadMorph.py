import sqlite3

if __name__ == "__main__":
	output = sqlite3.connect('valide.db3')
	outc=output.cursor()
	outc.execute('delete from Morph;')
	files=['./old/MM.adj','./old/MM.verb','./old/MM.nom','./old/MM.adv']
	for f in files:
		file=open(f,'r')
		c=file.read()
		file.close()
		for line in c.split("\n"):
			toks=line.strip().split(" ")
			if len(toks)==3:
				outc.execute("insert into Morph values('"+toks[0]+"','"+toks[1]+"','"+toks[2]+"');")
	output.commit()
	output.close()