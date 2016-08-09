var paises=[]
var limite=15;
var usos=[]
var selPaises;
var selUsos;

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
					localHandler(JSON.parse(data));
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

function analizaTexto()
{
	selPaises=extractCheckValues("#checkPaises");
	selUsos=extractCheckValues("#checkUsos");
	var texto='<?xml version="1.0" encoding="UTF-8"?>';
	texto+="<target>"+text2html($("#texto").val())+"</target>";
	$("#analiza").html("<p><b>El an&aacute;lisis no gener&oacute; resultados.</b></p>");
	if(texto.length<5)
	{
		alert('No has ingresado suficiente texto');
		return '';
	}
	if(selPaises.length<1)
	{
		alert('No seleccionaste paises');
		return '';
	}
	if(selUsos.length<1)
	{
		alert('No seleccionaste usos');
		return '';
	}
	$("#analiza").html("<div class='espera'><img src='loading.gif'/></div>");
	texto=limpiaUnicode(texto);
	askSomething("analiza",{Paises:vec2str(selPaises),Usos:vec2str(selUsos),text:texto},analiza,{});
}

function limpiaUnicode(texto)
{
	var t='';
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

function getMatch(hit,hidx)
{
	var words=hit['parrafo'].split(" ");
	var longitud=hit['texto'].split(" ").length;
	var radio=8;
	var h="<div style='font-weight:normal;cursor:pointer;' onclick='showParagraph("+String(hit["pidx"])+","+String(hidx)+")'>";
	for(var i=0;i<words.length;i++)
	{
		if(i==hit["ppi"])
		{
			h+="<span style='font-size:20px;font-weight:normal;'>";
		}
		if(i==hit["ppi"]+longitud)
		{
			h+="</span>";
		}
		if(i>hit["ppi"]-radio&&i<hit["ppi"]+radio)
		{
			if(i==1+hit["ppi"]-radio&&i>0)
			{
				h+="..."
			}
			else
			{
				h+=" ";
			}
			h+=words[i];
		}
		if(i==hit["ppi"]+radio)
		{
			if(i<words.length-1)
			{
				h+="..."
			}
		}
	}
	if(i==hit["ppi"]+longitud)
	{
		h+="</span>";
	}
	h+="</div>";
	return h;
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
	for(var i=0;i<currentParagraphs.length;i++)
	{
		if(pidx==i)
		{
			v+=$("#parrafo").val()+"\n";
		}
		else{
			v+=currentParagraphs[i]+"\n";
		}
	}
	$("#texto").val(v);
	dismiss("#dialog");
	oldPos=hidx;
	analizaTexto();
}
var oldPos="";

function showSinonimos(paisix,conceptoix,hitix)
{
	oldP=currentHits[hitix]["parrafo"];
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

function cambiar(sinidx,hidx)
{
	var hit=currentHits[hidx];
	var sinonimo=hit[sinonimos][sinidx];
	var original=hit["texto"];
	askSomething("cambia",{"text":$("#parrafo").val(),"sinonimo":sinonimo[0],"sinpos":sinonimo[5],"singen":sinonimo[4],"original":original,"ppi":hit["ppi"]},cambiame,{});
}

function cambiame(data)
{
	$("#parrafo").val(data);
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


function analiza(data)
{
	var hits=data["hits"]
	currentParagraphs=data["parrafos"];
	currentHits=hits;
	if(hits.length==0)
	{
		$("#analiza").html("<p><b>El an&aacute;lisis no gener&oacute; resultados.</b></p>");
	}
	else
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
			h+='<div class="hitHeaderContent" style="width:25%">';
			h+=getMatch(hit,hidx);
			h+='</div>';
			h+='<div class="hitHeaderContent" style="width:60%">';//Paises 
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
			h+='</div>';


			h+='</div>';
			h+='</div>';
			hidx++;
		}
		$("#analiza").html(h);
	}
	if(oldPos!="")
	{
		var myElement = document.getElementById('hit_'+String(oldPos));
		var topPos = myElement.offsetTop;
		document.getElementById('analiza').scrollTop = topPos;
		oldPos="";
	}
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