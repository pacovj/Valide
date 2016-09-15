//Agregar un dialgo de alert en vez de alert

var paises=[]
var limite=12;
var usos=[]
var selPaises;
var selUsos;
var currentView="texto_";

function toTitleCase(str)
{
	return str.charAt(0).toUpperCase() + str.substr(1);
}

function init()
{
	window.onbeforeunload = function (event) {
						askSomething("shutdown",{},doNothing,{});
				};
	askSomething("loadPaises",{},loadPaises,{});
	askSomething("loadUsos",{},loadUsos,{});
}

function paintCheck(etiqueta, options,target,colors)
{
	var h='<div class="etiqueta">'+etiqueta+'</div>'
	h+='<div class="coll2 left">'
	h+='<input type="checkbox" onchange="toggleAll(\''+target+'\',this)" checked>Todos<br>';
	var i=1;
	var j=0;
	for (option of options)
	{
		if(i>limite)
		{
			h+='</div>'
			h+='<div class="col2 right">'
			i=0;
		}
		color=colors[j];
		h+='<input type="checkbox" checked><span style="color:'+color+'">'+toTitleCase(option)+'</span><br>';
		i++;
		j++;
	}
	h+='</div>'
	$(target).html(h);
}

function loadPaises(data)
{
	paises=paises.concat(data);
	var check=[];
	var colors=[];
	for (pais of paises)
	{
		check.push(pais[0]);
		colors.push('black');
	}
	paintCheck('1) Selecciona los paises objetivo:',check,'#checkPaises',colors);
}

function loadUsos(data)
{
	usos=usos.concat(data);
	var check=[];
	var colors=[];
	for (uso of usos)
	{
		check.push(uso[0]);
		colors.push(uso[1]);
	}
	paintCheck('2) Selecciona los usos objetivo:',check,'#checkUsos',colors);
}

function toggleAll(id,me)
{
	$(id+" input[type='checkbox']").prop('checked',me.checked);
}

function askSomething(script,params,localHandler,localParams)
{
	$.ajax({
				method: "POST",
				url: script,
				data: params,
				local:localParams,
				success:function(data)
				{
					if(typeof data["error"]=='undefined')
					{
						localHandler(JSON.parse(data));
					}
					else
					{
						alert("Ocurrio un error inesperado")
					}
				}
			}
		);
}

function doNothing(data)
{
}

function clickTab(id,object)
{
	$(".contenido").each(function()
		{
			if(!$(this).hasClass("invisible"))
			{
				$(this).toggleClass("invisible");
			}
		}
	);
	$(".selTab").each(function()
		{
			$(this).attr("class","tab");
		}
	);
	$("#"+id).toggleClass("invisible");
	$(object).toggleClass("selTab");
	if(id=='analiza')
	{
		analizaTexto();
	}
	expandMe(-1);
}

function text2html(texto)
{
	var h="";
	for (line of texto.split("\n"))
	{
		h+="<p>";
		h+=line;
		h+="</p>";
	}
	return h;
}

function alertMe(msg)
{
	$(".modal-title").html("Información");
	$("#bBox").html("<br/>"+msg);
	$("#picBox").html("<span style='font-size:22px;'>&#9888;</span>");
	$("#dialog").toggleClass("invisible");
}

function analizaTexto()
{
	selPaises=extractCheckValues("#checkPaises");
	selUsos=extractCheckValues("#checkUsos");
	var texto='<?xml version="1.0" encoding="UTF-8"?>';
	var t=text2html($("#texto").val());
	texto+="<target>"+t+"</target>";
	$("#analiza").html("<p><b>El an&aacute;lisis no gener&oacute; resultados.</b></p>");
	if(t.length<5||t=="<p></p>")
	{
		alertMe('No has ingresado suficiente texto');
		return '';
	}
	if(selPaises.length<1)
	{
		alertMe('No seleccionaste paises');
		return '';
	}
	if(selUsos.length<1)
	{
		alertMe('No seleccionaste usos');
		return '';
	}
	$("#analiza").html("<div class='espera'><img src='loading.gif'/></div>");
	texto=limpiaUnicode(texto);
	askSomething("analiza",{Paises:vec2str(selPaises),Usos:vec2str(selUsos),text:texto},analiza,{});
}

function limpiaUnicode(texto)
{
	var t='';
	var hasUnicode=0;
	for(var i=0;i<texto.length;i++)
		if(texto.charCodeAt(i)<128)
		{
			t+=texto[i];
		}
		else
		{
			t+='|u'+String(texto.charCodeAt(i))+";";
		}
	return t;
}

function vec2str(vec)
{
	var str='';
	for(var i=0;i<vec.length;i++)
	{
		if(i>0)
		{
			str+=',';
		}
		str+=String(vec[i]);
	}
	return str;
}

function dismiss(target)
{
	$(target).toggleClass("invisible");
	$("#picBox").attr("style","");
	$("#picBox").attr("class","frameBox");
	$("#sinonimos").html("");
	$("#sinonimos").attr("style","");
}

function setParrafo()
{
	$("#parrafo").val(oldP);
}

function saveParrafo(pidx,hidx)
{
	var v="";
	var cidx=-1;
	for(var i=0;i<currentParagraphs.length;i++)
	{
		if(cidx!=currentipidxs[i])
		{
			if(v!="")
			{
				v+="\n";
			}
			cidx=currentipidxs[i];
		}
		if(pidx==i)
		{
			v+=$("#parrafo").val().trim();
		}
		else{
			v+=currentParagraphs[i].trim();
		}
		if(!v.trim().endsWith("."))
		{
			v=v.trim()+".";
		}
		if(!v.endsWith(" "))
		{
			v+=" ";
		}
	}
	$("#texto").val(limpiame(v));
	dismiss("#dialog");
	oldPos=hidx;
	analizaTexto();
	alertMe("Texto original fue modificado")
}
var oldPos="";

function showSinonimos(paisix,conceptoix,hitix)
{
	oldP=$("<div>"+currentHits[hitix]["parrafo"]+"</div>").text();
	oldP=limpiame(oldP);
	$("#dialog").toggleClass("invisible");
	$(".modal-title").html("Edita tu parrafo usando variantes de "+currentHits[hitix]["conceptos"][conceptoix][0]+" en "+paises[paisix][0]);
	$("#picBox").attr("class","textBox");
	var p='<div><textarea id="parrafo" cols="50" rows="10">'+oldP+"</textarea></div>";
	$("#picBox").html(p);
	var h='<button type="button" onclick="saveParrafo('+String(currentHits[hitix]["pidx"])+','+String(hitix)+')">Guardar cambios</button><br/><br/>';
	h+='<button type="button" onclick="setParrafo()">Revertir cambios</button>';
	$("#bBox").html(h);
	var p="";
	var sidx=0;
	for (sinonimo of currentHits[hitix]["sinonimos"])
	{
		if (sinonimo[1]==paises[paisix][0] && sinonimo[2]==currentHits[hitix]["conceptos"][conceptoix][0])
		{
			p+="<div class='sinonimo'>";
			p+="<div class='sintext'>"+sinonimo[0]+"</div>";
			p+="<div class='sinuso'>"
			var uso=getUso(sinonimo[3])
			p+="<svg width='24' height='24'>";
			p+="<rect width='24' height='24' style='fill:"+usos[uso][1]+";'>";
			p+="<title>"+usos[uso][0]+"</title>";
			p+="</title>";
			p+="</svg>";
			p+="</div>";
			p+="<div class='singenero' title='genero'>"+sinonimo[4]+"</div>";
			p+="<div class='sinpos' title='categoría gramatical'>"+sinonimo[5]+"</div>";
			p+="<div class='sindispersion' title='dispersión'>"+sinonimo[9]+"</div>";
			p+="<div class='sinuso' title='Ejemplo: "+sinonimo[8]+"'>&#x1f50d;</div>"
			p+="<div class='sinchange' title='Usar mejor esta variante' onclick='cambiar("+String(sidx)+","+String(hitix)+")'>&#8635;</div>"
			p+="</div>";
		}
		sidx++;
	}
	$("#sinonimos").attr("style","height:140px;overflow-y:auto;text-align:center;");
	$("#sinonimos").html(p);
}
var alertarCambio;
function cambiar(sinidx,hidx)
{
	var hit=currentHits[hidx];
	var sinonimo=hit["sinonimos"][sinidx];
	var original=hit["texto"];
	var cv="";
	for (v of hit["sinonimos"])
	{
		if(v[0]==hit["variantes"][0][0])
		{
			cv=v;
		}
	}
	alertarCambio=false;
	if (cv!="")
	{
		alertarCambio=sinonimo[4]!=cv[4];
	}
	hit["texto"]=sinonimo[0];
	askSomething("cambia",{"text":limpiaUnicode($("#parrafo").val()),"sinonimo":sinonimo[0],"sinpos":sinonimo[5],"singen":sinonimo[4],"original":original,"ppi":hit["ppi"]},cambia,{});
}

function limpiame(data)
{
	var c=0;
	var t="";
	for(c=0;c<data.length;c++)
	{
		if(data[c]=="&"&&data[c+1]=="#"&&data[c+2]=="x")
		{
			c=c+2;
			co="0";
			while(data[c]!=";")
			{
				co+=data[c];
				c++;
			}
			t+=String.fromCharCode(parseInt(co));
		}
		else
		{
			t+=data[c];
		}
	}
	return t;
}

function cambia(data)
{
	$("#parrafo").val(limpiame(data["texto"]));
	if(alertarCambio)
	{
		alert("¡Hubo cambio de genero/número!");
	}
}

var oldP;
function showParagraph(pidx,hidx)
{
	var texto=currentHits[hidx]["parrafo"];
	oldP=texto;
	$("#dialog").toggleClass("invisible");
	$(".modal-title").html("Edita tu parrafo");
	$("#picBox").attr("class","textBox");
	var p='<textarea id="parrafo" cols="50" rows="10">'+texto+"</textarea>";
	$("#picBox").html(p);
	var h='<button type="button" onclick="saveParrafo('+String(pidx)+','+String(hidx)+')">Guardar cambios</button><br/><br/>';
	h+='<button type="button" onclick="setParrafo()">Revertir cambios</button>';
	$("#bBox").html(h);
}


function showUso(uname)
{
	var uso=usos[getUso(uname)];
	$("#dialog").toggleClass("invisible");
	$(".modal-title").html("Información del uso");
	var h="";
	h+="<svg width='100' height='100'>";
	h+="<rect width='100' height='100' style='fill:"+uso[1]+";'>";
	h+="<title>"+uso[0]+"</title>";
	h+="</title>";
	h+="</svg>";
	$(".frameBox").html(h);
	h="";
	h+="<div><span class='milabel'>Nombre: </span>"+uso[0]+"</div>";
	h+="<div><span class='milabel'>Definición: </span>"+uso[2]+"</div>";
	$(".textBox").html(h);
}

function showConcepto(hidx,cidx)
{
	var concepto=currentHits[hidx]["conceptos"][cidx];
	$("#dialog").toggleClass("invisible");
	$(".modal-title").html("Información del concepto");
	var h="";
	h+="<img src='"+concepto[3]+"' ";
	h+="title='"+concepto[0]+"' style='width:200px;'/>";
	$(".frameBox").html(h);
	h="";
	h+="<div><span class='milabel'>Nombre: </span>"+concepto[0]+"</div>";
	h+="<div><span class='milabel'>Lengua de control: </span>"+concepto[1]+"</div>";
	h+="<div><span class='milabel'>Definición: </span>"+concepto[2]+"</div>";
	$(".textBox").html(h);
}

var currentHits;
var currentParagraphs;

function getHit(hidx)
{
	var hit=currentHits[hidx];
	var h="";
	var clusters=getClusters(hit["variantes"]);
	for (cluster of clusters)
	{
		c=0;
		h+="<div class='hitGroup'>";
		for (variante of cluster)
		{
			if(c==0)
			{
				var cidx=0;
				for (concepto of hit["conceptos"])
				{
					if(variante[2]==concepto[0])
					{
						h+="<img src='"+concepto[3]+"' ";
						h+="title='"+concepto[0]+"' class='mediumPic' onclick='showConcepto("+String(hidx)+","+String(cidx)+")'/>";
						break;
					}
					cidx++;
				}
				var uso=getUso(variante[3])
				h+="<svg class='miniBox'>";
				h+="<rect width='32' height='32' style='fill:"+usos[uso][1]+";' onclick='showUso(\""+variante[3]+"\")'>";
				h+="<title>"+usos[uso][0]+"</title>";
				h+="</title>";
				h+="</svg>";
			}
			
			c++;
			var pic=getPais(variante[1])
			h+="<img src='flags/"+paises[pic][2]+"' ";
			h+="title='"+paises[pic][0]+"' class='miniPic' onclick='showSinonimos("+String(pic)+","+String(cidx)+","+String(hidx)+")'/>";
		}
		h+="</div>";
	}
	return h;
}

function getHits(hits)
{
	var h='';
	var hidx=0;
	for (hit of hits)
	{
		h+='<div class="hit" id="hit_'+String(hidx)+'">';
		h+='<div class="hitHeader">';
		h+='<div class="hitHeaderContent" style="width:15%">';
		h+=hit["texto"];
		h+='</div>';
		h+='<div class="hitHeaderContent" style="width:40%">';
		var np=$("<div>"+hit["parrafo"]+"</div>");
		np.find(".thit").each(function()
		{
			if (!$(this).hasClass("texto_"+String(hidx)))
			{
				$(this).toggleClass("thit");
			}
			$(this).attr("onclick","");
			$(this).attr("style","cursor:text;");
		});
		h+=np.html();
		h+='</div>';
		h+='<div class="hitHeaderContent" style="width:45%">';//Paises 
		h+=getHit(hidx);
		h+='</div>';


		h+='</div>';
		h+='</div>';
		hidx++;
	}
	return h;
}

function verEstadísticas()
{
	currentView="stats_";
	if(!$("#textoMarcado").hasClass("invisible"))
	{
		$("#textoMarcado").toggleClass("invisible");
	}
	if($("#estadisticas").hasClass("invisible"))
	{
		$("#estadisticas").toggleClass("invisible");
	}
	if(!$("#hitDetail").hasClass("invisible"))
	{
		$("#hitDetail").toggleClass("invisible");
	}
}


function verTexto()
{
	currentView="texto_";
	if($("#textoMarcado").hasClass("invisible"))
	{
		$("#textoMarcado").toggleClass("invisible");
	}
	if(!$("#estadisticas").hasClass("invisible"))
	{
		$("#estadisticas").toggleClass("invisible");
	}
	if(!$("#hitDetail").hasClass("invisible"))
	{
		$("#hitDetail").toggleClass("invisible");
	}
}

function verHits()
{
	currentView="hit_";
	if(!$("#textoMarcado").hasClass("invisible"))
	{
		$("#textoMarcado").toggleClass("invisible");
	}
	if(!$("#estadisticas").hasClass("invisible"))
	{
		$("#estadisticas").toggleClass("invisible");
	}
	if($("#hitDetail").hasClass("invisible"))
	{
		$("#hitDetail").toggleClass("invisible");
	}
}

function getStats(hits)
{
	var cpaises=[];
	var pcounts=[];
	var cusos=[];
	var ucounts=[];
	for (hit of hits)
	{
		for (pais of hit["paises"])
		{
			var idx=cpaises.indexOf(pais);
			if (idx==-1)
			{
				cpaises.push(pais);
				pcounts.push(1);
			}
			else
			{
				pcounts[idx]++;
			}
		}
		for (uso of hit["usos"])
		{
			var idx=cusos.indexOf(uso);
			if (idx==-1)
			{
				cusos.push(uso);
				ucounts.push(1);
			}
			else
			{
				ucounts[idx]++;
			}
		}
	}
	sortArray(cpaises,pcounts);
	sortArray(cusos,ucounts);
	var h="";
	h+="<div class='hit'>"
	h+="<div class='hitTitle'>Conteo de ocurrencias por país</div>"
	for(var i=0;i<cpaises.length;i++)
	{
		var pic=cpaises[i];
		h+="<div class=mhit>";
		h+="<div class='count'>";
		h+="<img src='flags/"+paises[pic][2]+"'";
		h+="title='"+paises[pic][0]+"' class='miniPic' style='cursor:default;'/>";
		h+="</div>";
		h+="<div class='count'>"+String(pcounts[i])+"</div>";
		h+="</div>";
	}
	h+="</div>";
	h+="<div class='hit'>"
	h+="<div class='hitTitle'>Conteo de ocurrencias por uso</div>"
	for(var i=0;i<cusos.length;i++)
	{
		var uso=cusos[i];
		h+="<div class=mhit>";
		h+="<div class='count'>";
		h+="<svg class='miniBox' style='cursor:default;'>";
		h+="<rect width='32' height='32' style='fill:"+usos[uso][1]+";'>";
		h+="<title>"+usos[uso][0]+"</title>";
		h+="</title>";
		h+="</svg>";
		h+="</div>";
		h+="<div class='count'>"+String(ucounts[i])+"</div>";
		h+="</div>";
	}
	h+="</div>";
	return h;
}

function sortArray(v,c){
	for(var i=0;i<c.length-1;i++)
	{
		var sel=i;
		for(var j=sel+1;j<c.length;j++)
		{
			if(c[sel]<c[j])
			{
				sel=j;
			}
		}
		aux=c[i];
		c[i]=c[sel];
		c[sel]=aux;
		aux=v[i];
		v[i]=v[sel];
		v[sel]=aux;
	}
}

function clickMe(hidx)
{
	$(".thit").each(function()
	{
		if($(this).hasClass("blue"))
		{
			$(this).toggleClass("blue")
		}
	});
	$("#texto_"+String(hidx)).toggleClass("blue");
	var h="";
	h+="<div class='hitTitle'>Usos y significados de la palabra "+currentHits[hidx]["texto"]+"</div>";
	h+=getHit(hidx);
	$(".hitView").html(h);
}

var currentipidxs;

function analiza(data)
{
	var hits=data["hits"];
	var texto=data["tag"];
	currentParagraphs=data["parrafos"];
	currentipidxs=data["ipidxs"];
	currentHits=hits;
	if(hits.length==0)
	{
		$("#analiza").html("<p><b>El an&aacute;lisis no gener&oacute; resultados.</b></p>");
	}
	else
	{
		var h="";
		h+="<button class='sboton' onclick='verTexto()'>Texto marcado</button>";
		h+="<button class='sboton' onclick='verHits()'>Lista de coincidencias("+String(hits.length)+")</button>";
		h+="<button class='sboton' onclick='verEstadísticas()'>Estadísticas</button>";
		h+="<div id='textoMarcado'>"
		h+="<div class='tc'>";
		h+="<div class='textView'>";
		h+=texto;
		h+="</div>";
		//h+="<div class='empty'></div>";
		h+="<div class='hitView'>";
		h+="</div>";
		//h+="<div class='empty'></div>";
		h+="</div>";
		h+="</div>";
		h+="<div id='estadisticas' class='invisible'>"+getStats(hits)+"</div>";
		h+="<div id='hitDetail' class='invisible'>"+getHits(hits)+"</div>";
		$("#analiza").html(h);
	}
	if(currentView=="hit_")
	{
		verHits();
	}
	else
	{
		clickMe(0);
	}
	if(oldPos!="")
	{
		if(currentView=="texto_")
		{
			clickMe(oldPos);
		}
		var myElement = document.getElementById(currentView+String(oldPos));
		var topPos = 0;
		if (myElement!=null)
			topPos = myElement.offsetTop;
		document.getElementById('analiza').scrollTop = topPos;
		oldPos="";
	}
}

function getClustersVariante(variantes)
{
	var idxs=[];
	var clusters=[];
	var current=[];
	for (variante of variantes)
	{
		var key=variante[0]+variante[3];
		var idx=idxs.indexOf(key);
		if(idx==-1)
		{
			idxs.push(key);
			current=[];
			clusters.push(current);
		}
		else{
			current=clusters[idx];
		}
		current.push(variante);
	}
	return clusters;
}

function getClusters(variantes)
{
	var idxs=[];
	var clusters=[];
	var current=[];
	for (variante of variantes)
	{
		var key=variante[2]+variante[3];
		var idx=idxs.indexOf(key);
		if(idx==-1)
		{
			idxs.push(key);
			current=[];
			clusters.push(current);
		}
		else{
			current=clusters[idx];
		}
		current.push(variante);
	}
	return clusters;
}

function getUso(uso)
{
	for(var i=0;i<usos.length;i++)
	{
		if(usos[i][0]==uso)
		{
			return i;
		}
	}
	return -1;
}
function getPais(pais)
{
	for(var i=0;i<paises.length;i++)
	{
		if(paises[i][0]==pais)
		{
			return i;
		}
	}
	return -1;
}

function extractCheckValues(id)
{
	var i=0;
	var sel=[];
	$(id+" input[type='checkbox']").each(function()
		{
			if(i>0&&this.checked)
			{
				sel.push(i-1);
			}
			i++;
		}
	);
	return sel;
}

var currentConceptos="";
var islinked=false;

function searchMe()
{
	$("#ctarget").val($("#nombreConcepto").val());
	islinked=true;
	searchConcepto();
}

function searchConcepto()
{
	if($("#ctarget").val().length>0)
	{
		askSomething("searchConcepto",{"texto":$("#ctarget").val().toUpperCase()},getConceptos,{});
	}
}

function getConceptos(data)
{
	currentConceptos=data["conceptos"];
	if(currentConceptos.length==0&&!islinked)
	{
		alertMe("No hay conceptos que coincidan con tu busqueda");
	}
	islinked=false;
	var h="";
	var cidx=0;
	h+='<div class="chit" onclick="expandMe(-1)">';
	h+="<div class='fchit' style='width:20%'>";
	h+="&#x2b;";
	h+="</div>";
	h+="<div class='fchit' style='width:80%'>"
	h+="Nuevo concepto";
	h+="</div>";
	h+="</div>";
	for(concepto of currentConceptos)
	{
		h+='<div class="chit" onclick="expandMe('+String(cidx)+')">';
		h+="<div class='fchit' style='width:20%'>";
		h+="<img src='"+concepto[3]+"' class='mediumPic'/>";
		h+="</div>";
		h+="<div class='fchit' style='width:80%'>"
		h+=concepto[0];
		h+="</div>";
		h+="</div>";
		cidx+=1;
	}
	$(".searchResults").html(h);
}


function expandMe(cidx)
{
	var h="<div id='layoutConceptos'>";
	var concepto;
	if(cidx>=0)
	{
		concepto=currentConceptos[cidx];
	}
	else
	{
		concepto=["","","","ref.jpg"];
	}
	h+="<div class='titulo'>Datos generales";
	h+="<span class='boton' onclick='borraConcepto("+String(cidx)+")'>&#x26D4;</span>";
	h+="<span class='boton' style='margin-top:1px;' onclick='saveConcepto("+String(cidx)+")'>&#x1f4be;</span>";
	h+="</div>";
	h+='<div class="full bborder">';
	h+='<div class="cell2">';
	h+='<div class="full">';
	h+="<span class='milabel'>Nombre:  </span>";
	h+="</div>";
	h+='<div class="full">';
	h+="<input type='text' id='nombreConcepto' value='"+concepto[0]+"' onblur='searchMe()'></input>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Lengua de control:  </span>";
	h+="</div>";
	h+='<div class="full">';
	h+="<input type='text' id='lenguaConcepto' value='"+concepto[1]+"'></input>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Definición:  </span>";
	h+="</div>";
	h+='<div class="full">';
	h+="<textarea id='definicionConcepto' rows='5'>"+concepto[2]+"</textarea>";
	h+="</div>";	
	h+="</div>";
	
	h+='<div class="cell2">';
	h+='<div class="full">';
	h+="<span class='milabel'>Imagen actual:  </span>";
	h+="</div>"
	h+="<img src='"+concepto[3]+"' id='currentPic' class='bigPic'/>"
	h+='<div class="full">';
	h+="<input type='file' id='pic'/>"
	h+="</div>";
	h+="</div>";
	h+="</div>";
	h+="</div>";
	h+='<div class="full invisible bborder" id="layoutVariantes"></div>';
	$(".result").html(h);
	currentPic=concepto[3];
	$("#pic").change(function(){
    readURL(this);
	});
	if (concepto[0]!="")
		askSomething("dameVariantes",{"nombre":$("#nombreConcepto").val()},pintaVariantes,{});
	else
		pintaVariantes({"variantes":[]});
}

var editaVariantes=[];
var vidx;

function pintaVariantes(data)
{
	editaVariantes=getClustersVariante(data["variantes"]);
	vidx=-1;
	var h="";
	h+="<div class='titulo'>Variantes";
	h+="<span class='boton' onclick='borraVariantes()'>&#x26D4;</span>";
	h+="<span class='boton' style='margin-top:1px;' onclick='saveVariantes()'>&#x1f4be;</span>";
	h+="</div>";
	h+='<div class="variantes">';
	h+="<div style='display:table'>";
	h+="<div class='listaVariantes'>";
	var cidx=0;
	h+='<div class="chit" onclick="expandVariante(-1)">';
	h+="<div class='fchit' style='text-align:center;'>";
	h+="Nueva variante";
	h+="</div>";
	h+="</div>";
	var vi=0;
	for(variantes of editaVariantes)
	{
		h+='<div class="chit" onclick="expandVariante('+String(vi)+')">';
		var cp=[];
		var up=[];
		h+="<div class='fchit' style='width:40%'>";
		h+=variantes[0][0];
		h+="</div>";
		h+="<div class='fchit' style='width:60%'>";
		for(v of variantes)
		{
			var uso=getUso(v[3]);
			if(up.indexOf(uso)<0)
			{
				up.push(uso);
				h+="<svg width='20' height='20'>";
				h+="<rect width='20' height='20' style='fill:"+usos[uso][1]+";'>";
				h+="<title>"+usos[uso][0]+"</title>";
				h+="</title>";
				h+="</svg>";
			}
		}
		for(v of variantes)
		{
			var pic=getPais(v[1]);
			if (cp.indexOf(pic)<0)
			{
				h+="<img src='flags/"+paises[pic][2]+"' ";
				h+="title='"+paises[pic][0]+"' class='microPic'/>";
				cp.push(pic);
			}
		}
		h+="</div>";
		h+="</div>";
		vi++;
	}
	h+="</div>";
	h+="</div>";
	h+='<div class="varianteActual">';
	h+="";
	h+="</div>";
	h+="</div>";
	$("#layoutVariantes").html(h);
	if(editaVariantes.length>0)
	{
		expandVariante(0);
	}
	else
	{
		expandVariante(-1);
	}
}

var currentPic="ref.jpg";
var completePic="";

function readURL(input) {

    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
						currentPic=e.target.result;
						completePic=currentPic;
						currentPic=currentPic.substring(currentPic.indexOf(",")+1);
            $('#currentPic').attr('src', e.target.result);
        }

        reader.readAsDataURL(input.files[0]);
    }
}


function countHits()
{
	var hits=0;
	for(concepto of currentConceptos)
	{
		if($("#nombreConcepto").val()==concepto[0])
		{
			hits++;
		}
	}
	return hits;
}

function checkInput(id)
{
	if($(id).val().length<1)
	{
		$(id).focus();
		$(id).attr("style","border: 2px solid red;");
		alertMe("Te faltan datos");
		return false;
	}
	return true;
}

function borraConcepto(cidx)
{

	var nn=$("#nombreConcepto").val();
	askSomething("borraConcepto",{"nombre":nn},correcto2,{});
}

function saveConcepto(cidx)
{
	//validaciones
	var hits=countHits();
	if(checkInput("#nombreConcepto")&&checkInput("#lenguaConcepto"))
	{
		if(hits==0)//nuevo concepto
		{
			askSomething("nuevoConcepto",{"nombre":$("#nombreConcepto").val(),
			"lengua":$("#lenguaConcepto").val(),
			"definicion":$("#definicionConcepto").val(),
			"pic":currentPic},correcto,{});
		}
		else//actualiza concepto
		{
			askSomething("salvaConcepto",{"nombre":$("#nombreConcepto").val(),
			"original":currentConceptos[cidx][0],
			"lengua":$("#lenguaConcepto").val(),
			"definicion":$("#definicionConcepto").val(),
			"pic":currentPic,"nuevaPic":currentPic!=currentConceptos[cidx][3]},correcto3,{});
		}
	}
}

function correcto()
{
	searchMe();
}

function correcto2()
{
	searchMe();
	expandMe(-1);
}

function correcto3()
{
	searchMe();
	$('.mediumPic')[0].src=completePic;
}

function switchLayout()
{
	$("#layoutVariantes").toggleClass("invisible");
	$("#layoutConceptos").toggleClass("invisible");
}

var generos=["masculino","femenino","neutro"];
var pos=["sustantivo","verbo"];

function expandVariante(vidx)
{
	var h="";
	var variante;
	if(vidx>=0)
	{
		variante=editaVariantes[vidx];
	}
	else
	{
		variante=[["",paises[0][0],$("nombreConcepto").val(),usos[3][0],"masculino","sustantivo",0,"No disponible","No disponible",0.0]];
	}
	h+='<div class="full">';
	h+="<span class='milabel'>Forma base:  </span>";
	h+="</div>";
	h+='<div class="full">';
	h+="<input type='text' id='nombreVariante' value='"+variante[0][0]+"' placeholder='Escribe aquí tu forma base'";
	if(vidx>=0)
	{
		h+=" readonly";
	}
	h+="></input>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Paises:  </span>";
	h+="</div>";
	h+='<div style="display:table;margin-bottom:12px;">';
	h+='<div style="width:600px;display:table-cell;">';
	var i=1;
	var j=0;
	var ml=Math.ceil(paises.length/2);
	for (pais of paises)
	{
		if(i>ml)
		{
			h+='</div>'
			h+='<div style="width:300px;display:table-cell;">';
			i=0;
		}
		h+='<div><input type="checkbox" class="check"';
		for(v of variante)
		{
			if(v[1]==pais[0])
			{
				h+=" checked";
				break;
			}
		}
		h+='/>'+toTitleCase(pais[0])+'</div>';
		i++;
		j++;
	}
	h+="</div>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Uso:  </span>";
	h+="<select id='usoVariante'";
	if(vidx>=0)
	{
		h+=" disabled";
	}
	h+=">";
	for(uso of usos)
	{
		h+="<option ";
		if(variante[0][3]==uso[0])
		{
			h+='selected';
		}
		h+=">";
		h+=uso[0];
		h+="</option>";
	}
	h+="</select>";
	h+="<span class='milabel'>Genero:  </span>";
	h+="<select id='generoVariante'>";
	for(genero of generos)
	{
		h+="<option ";
		if(variante[0][4]==genero)
		{
			h+='selected';
		}
		h+=">";
		h+=genero;
		h+="</option>";
	}
	h+="</select>";
	h+="<span class='milabel'>Función gramatical:  </span>";
	h+="<select id='posVariante'>";
	for(p of pos)
	{
		h+="<option ";
		if(variante[0][5]==p)
		{
			h+='selected';
		}
		h+=">";
		h+=p;
		h+="</option>";
	}
	h+="</select>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Nivel:  </span>";
	h+="<input type='text' class='input2' id='nivelVariante' value='"+variante[0][6]+"'></input>";
	h+="<span class='milabel'>Dispersion:  </span>";
	var vd=variante[0][9];
	if(String(vd)=="null")
	{
		vd="";
	}
	h+="<input type='text' class='input2' id='dispersionVariante' value='"+vd+"'></input>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Nota:  </span>";
	h+="</div>";
	h+='<div class="full">';
	h+="<textarea id='notaVariante' rows='4'>"+variante[0][7]+"</textarea>";
	h+="</div>";
	h+='<div class="full">';
	h+="<span class='milabel'>Ejemplos:  </span>";
	h+="</div>";
	h+='<div class="full">';
	h+="<input type='text' id='ejemploVariante' value='"+variante[0][8]+"'></input>";
	h+="</div>";
	$(".varianteActual").html(h);
	h+='</div>'
}

function existeVariante(i)
{
	for(cluster of editaVariantes)
	{
		for(variante of cluster)
		{
			if(variante[0]==$("#nombreVariante").val()&&variante[3]==$("#usoVariante option:selected").text()&&variante[1]==paises[i][0])
			{
				return true;
			}
		}
	}
	return false;
}

function saveVariantes()
{
	var i=0;
	$(".check").each(function()
	{
		if(this.checked)
		{
			var variante={};
			variante["nombre"]=$("#nombreVariante").val();
			variante["uso"]=$("#usoVariante option:selected").text();
			variante["concepto"]=$("#nombreConcepto").val();
			variante["pais"]=$("<div>"+paises[i][0]+"</div>").text();
			variante["genero"]=$("#generoVariante option:selected").text();
			variante["pos"]=$("#posVariante option:selected").text();
			variante["nivel"]=$("#nivelVariante").val();
			variante["nota"]=$("#notaVariante").val();
			variante["ejemplo"]=$("#ejemploVariante").val();
			variante["dispersion"]=$("#dispersionVariante").val();
			if(existeVariante(i))//update
			{
				askSomething("updateVariante",variante,doNothing,{})
			}
			else//insert
			{
				askSomething("createVariante",variante,doNothing,{})
			}
		}
		i++;
	});
	askSomething("dameVariantes",{"nombre":$("#nombreConcepto").val()},refreshVariantes,{});
}

function refreshVariantes(data)
{
	pintaVariantes(data);
	var cidx=0;
	for(cluster of editaVariantes)
	{
		for(variante of cluster)
		{
			if ($("<div>"+variante[0]+"</div>").text()==$("#nombreVariante").val())
			{
				expandVariante(cidx);
				return "";
			}
		}
		cidx++;
	}
}

function borraVariantes()
{
	var variante={};
	variante["nombre"]=$("#nombreVariante").val();
	variante["uso"]=$("#usoVariante option:selected").text();
	variante["concepto"]=$("#nombreConcepto").val();
	askSomething("borraVariante",variante,refreshMe,{});
}

function refreshMe()
{
	askSomething("dameVariantes",{"nombre":$("#nombreConcepto").val()},refreshVariantes,{});
}