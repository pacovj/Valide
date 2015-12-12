unit ValideLogic;

interface
uses
FireDAC.Comp.Client,System.StrUtils,SysUtils,Dialogs,Vcl.StdCtrls,Classes,System.Generics.Collections;

procedure loadFromDump(key:String;target:TFDTable;Query:TFDQuery;con:TFDConnection);
procedure loadDictionary(target:TFDTable);
function lemmatizeMe(word:String;Dictionary:TFDTable):String;
procedure lemmatize(words:TStrings;Dictionary:TFDTable;lemmas:TStrings);
procedure getUses(lemmas:TStrings;Query:TFDQuery);
procedure loadCollocations(target:TFDTable;Query:TFDQuery;variante:TFDTable;dictionary:TFDTable);
function listToString(words:TStrings;Separator:String):String;
function listNToString(words:TStrings;Separator:String;start:Integer;n:Integer):String;
procedure tokenizeMe(Line:String;Pos:TStrings;List:TStrings);

procedure getVariantes(words:TStrings;lemmas:TStrings;variante:TFDTable;variantes:TObjectList<TStrings>;paises:String;varpaises:TFDTable;Clength:TStrings);
function filterPaises(paises:TStrings;Pais:TFDTable):String;
function isValid(clave_variante:String;paises:String;varpaises:TFDTable):Boolean;
procedure getUsos(variante:TStrings;pais:String;varpaises:TFDTable;usos:TStrings);

procedure getConceptos(variantes:TStrings;paisOrigen:String;paisDestino:String;variante:TFDTable;varpais:TFDTable;concepto:TFDQuery;conceptos:TStrings;synOrigen:TObjectList<TStrings>;synDestino:TObjectList<TStrings>);


implementation


procedure loadDictionary(target:TFDTable);
var
  myFile : TextFile;
  list : TStrings;
  pos : TStrings;
  line : UTF8String;
  i:Integer;
begin
   target.TableName:='MORPH';
   target.Active:=true;
   if target.RecordCount<1 then
   begin
     AssignFile(myFile, 'dbs/dumps/morph.txt');
     Reset(myFile);
     // Display the file contents
     list:=TStringList.Create;
     pos:=TStringList.Create;
     while not Eof(myFile) do
     begin
        ReadLn(myFile, line);
        list.Clear;
        pos.Clear;
        tokenizeMe(line,pos,list);
        target.Insert;
        target.FieldValues['base']:=list[1];
        target.FieldValues['morph']:=list[0];
        target.FieldValues['tag']:=list[2];
        target.Post;
     end;
     list.Free;
     pos.Free;
     CloseFile(myFile);

   end;
end;

procedure loadCollocations(target:TFDTable;Query:TFDQuery;variante:TFDTable;dictionary:TFDTable);
var
  toks:TStrings;
  lemmas:TStrings;
  pos:TStrings;
begin
  if target.FieldByName('parsed').AsInteger=0 then
   begin
      Query.ExecSQL('alter table VARIANTE ADD COLUMN Palabras INTEGER;');
      Query.ExecSQL('alter table VARIANTE ADD COLUMN Lemmas VARCHAR(60);');
      Query.ExecSQL('alter table VARIANTE ADD COLUMN PrimerLemma VARCHAR(50);');
      variante.TableName:='VARIANTE';
      variante.Active:=true;
      variante.First;
      toks:=TStringList.Create;
      lemmas:=TStringList.Create;
      pos:=TStringList.Create;
      while not variante.Eof do
      begin
        toks.Clear;
        pos.Clear;
        lemmas.Clear;
        variante.Edit;
        tokenizeMe(variante.FieldValues['Variante'],pos,toks);
        lemmatize(toks,dictionary,lemmas);
        variante.FieldValues['Palabras']:=toks.Count;
        variante.FieldValues['Lemmas']:=listToString(lemmas,' ');
        variante.FieldValues['PrimerLemma']:=lemmas[0];
        variante.Post;
        variante.Next;
      end;
      target.Edit;
      target.FieldValues['parsed']:=1;
      target.Post;
      toks.Free;
      lemmas.Free;
      pos.Free;
   end;
end;

function listNToString(words:TStrings;Separator:String;start:Integer;n:Integer):String;
var
  i:Integer;
  s:String;
begin
  s:=words[start];
  i := 1;
  while (i<n) and ((start+i)<words.Count) do
  begin
    s:=s+Separator+words[start+i];
    i:=i+1;

  end;
  Result:=s;
end;

function listToString(words:TStrings;Separator:String):String;
var
  i:Integer;
  s:String;
begin
  if(words.Count>0) then
  begin
    s:=words[0];
  end
  else
  begin
    s:='';
  end;
  for i := 1 to words.Count-1 do
  begin
    s:=s+Separator+words[i];
  end;
  Result:=s;
end;

procedure lemmatize(words:TStrings;Dictionary:TFDTable;lemmas:TStrings);
var
  i:Integer;
begin
  for i := 0 to words.Count-1 do
  begin
    lemmas.Add(lemmatizeMe(words[i],Dictionary));
  end;

end;

procedure loadFromDump(key:String;target:TFDTable;Query:TFDQuery;con:TFDConnection);
var
   myFile : TextFile;
   line: String;
   cmd: String;
begin
   //target.Locate('name',key,[]);
   con.Connected:=false;
   con.Params.DriverID:='SQLite';
   con.Params.Database:='$(RUN)/dbs/'+target.FieldByName('name').AsString+'.db3';
   con.Connected:=true;
   con.Commit;
   //target.Active:=true;
   if target.FieldByName('loaded').AsInteger=0 then
   begin
     line:=GetCurrentDir();

     AssignFile(myFile, 'dbs/dumps/'+target.FieldByName('path').AsString);
     Reset(myFile);
     // Display the file contents
     cmd:='';
     while not Eof(myFile) do
     begin
       ReadLn(myFile, line);
       if NOT(AnsiContainsStr(line,'INDEX')) then
       begin
        cmd:=cmd+line;
       end
       else
       begin
         cmd:=Trim(cmd);
         if(AnsiEndsStr(',',cmd) ) then
          cmd:=AnsiMidStr(cmd,1,Length(cmd)-1);
       end;
       if(AnsiEndsStr(';',line)) then
       begin
        //Update database
        if NOT (AnsiStartsStr('DROP',cmd)) then
        begin
          if(AnsiContainsStr(cmd,'MimeToBin(')) then
          begin
             cmd:=AnsiReplaceStr(cmd,'MimeToBin(','');
             cmd:=AnsiReplaceStr(cmd,');',';');
          end;
          Query.SQL.Clear;
          Query.SQL.Append(cmd);
          Query.ExecSQL;

        end;
         cmd:='';
       end;
     end;
     Query.ExecSQL('CREATE TABLE MORPH (base VARCHAR(30), morph VARCHAR(30),tag VARCHAR(10));');
     con.Commit;
     target.Edit;
     target.fieldValues['loaded']:=1;
     target.Post;
     CloseFile(myFile);
   end;
end;

procedure tokenizeMe(Line:String;Pos:TStrings;List:TStrings);
const
  Separators: array of String =[';',',','.',':','?','�','[',']','{','}','_','^','!','�','|','"','#','$','%','&','(',')','=','?','�','�','''','+','*','>','<'];
  Spaces: array of String = [' ',string(Chr(9)),slineBreak];
var
  i:Integer;
  current:String;
  word:String;
  last:Integer;
begin
  word:='';
  last:=0;
  for i:=1 to Line.Length do
  begin
    current:=String(Line[i]);
    if(AnsiMatchStr(current,Separators) or AnsiMatchStr(current,Spaces)) then
    begin
      if word<>'' then
      begin
        List.Append(word);
        Pos.Append(IntToStr(last));
      end;
      word:='';
      last:=i;
    end
    else
    begin
      word:=word+current;
    end;
  end;
  if not word.Equals('') then
  begin
    List.Append(word);
    Pos.Append(IntToStr(last));
  end;
end;

function lemmatizeMe(word:String;Dictionary:TFDTable):String;
begin
  if Dictionary.Locate('morph',AnsiLowerCase(word),[]) then
  begin
    Result:=Dictionary.FieldByName('base').AsString;
  end
  else
  begin
    Result:=word;
  end;
end;

procedure getUses(lemmas:TStrings;Query:TFDQuery);
var
  i:Integer;
  n:Integer;
begin
  n:=3;
  i:=0;


end;


procedure getVariantes(words:TStrings;lemmas:TStrings;variante:TFDTable;variantes:TObjectList<TStrings>;paises:String;varpaises:TFDTable;Clength:TStrings);
var i:Integer;
    sel:TStrings;
    max:Integer;
    j:Integer;
    l:TStrings;
begin
   variante.Active:=false;
   variante.TableName:='VARIANTE';
   variante.Active:=true;
   i:=0;
   sel:=TStringList.Create;
   l:=TStringList.Create;
   while i<lemmas.Count do
   begin
      sel.Clear;
      l.Clear;
      variante.Filtered:=false;
      variante.Filter:='PrimerLemma='+QuotedStr(lemmas[i]);
      variante.Filtered:=true;
      if variante.RecordCount = 0 then
      begin
        Clength.Add('0');
        i:=i+1;
      end
      else
      begin
         max:=0;
         variante.First;
         while not variante.Eof do
         begin
            if listNToString(lemmas,' ',i,variante.FieldByName('Palabras').AsInteger)= variante.FieldByName('Lemmas').AsString then
            begin
              if (max<=variante.FieldByName('Palabras').AsInteger) or (listNToString(words,' ',i,variante.FieldByName('Palabras').AsInteger)= variante.FieldByName('Variante').AsString) then
              begin
                if isValid(variante.FieldByName('Clave_Variante').AsString,paises,varpaises) then
                begin
                  sel.Add(variante.FieldByName('Clave_Variante').AsString);
                  l.Add(IntToStr(variante.FieldByName('Palabras').AsInteger));
                  max:=variante.FieldByName('Palabras').AsInteger;
                end;
              end;
            end;
            variante.Next;
         end;
         if sel.Count=0 then
         begin
           i:=i+1;
           Clength.Add('0');
         end
         else
         begin
           for j:=0 to sel.Count-1 do
           begin
             if StrToInt(l[j])=max then
             begin
               variantes[i].Add(sel[j]);
             end;
           end;
           for j := 1 to max do
           begin
            if j=1 then
              Clength.Add(IntToStr(max))
            else
              Clength.Add('-1');
           end;
           i:=i+max;
         end;
      end;
      variante.Filtered:=false;

   end;

end;

function filterPaises(paises:TStrings;Pais:TFDTable):String;
var
  condiciones:TStrings;
  i:Integer;
begin
  condiciones:=TStringList.Create;
  Pais.Active:=true;
  for i := 0 to paises.Count-1 do
  begin
    if Pais.Locate('Pais',paises[i],[]) then
    begin
      condiciones.Add('Clave_Pais='+QuotedStr(Pais.FieldByName('Clave_Pais').AsString));
    end;
  end;
  Result:=ListToString(condiciones,' or ');
  condiciones.Free;
end;

procedure getUsos(variante:TStrings;pais:String;varpaises:TFDTable;usos:TStrings);
var
  i:Integer;
  condiciones:TStrings;
begin
  varpaises.Filtered:=false;
  condiciones:=TStringList.Create;
  for i := 0 to variante.Count-1 do
      condiciones.Add('Clave_Variante='+variante[i]);
  varpaises.Filter:='('+ListToString(condiciones,' or ')+') and Clave_Pais='+QuotedStr(pais);
  condiciones.Free;
  varpaises.Filtered:=true;
  varpaises.First;
  while not varpaises.Eof do
  begin
    usos.Add(varpaises.FieldByName('Clave_Uso').AsString);
    varpaises.Next;
  end;
end;

procedure getConceptos(variantes:TStrings;paisOrigen:String;paisDestino:String;variante:TFDTable;varpais:TFDTable;concepto:TFDQuery;conceptos:TStrings;synOrigen:TObjectList<TStrings>;synDestino:TObjectList<TStrings>);
var
  condiciones:TStrings;
  idconceptos:TStrings;
  tconceptos:TStrings;
  tvariantes:TObjectList<TStrings>;
  ttext:TObjectList<TStrings>;
  i:Integer;
  j:Integer;
begin
  condiciones:=TStringList.Create;
  idconceptos:=TStringList.Create;
  tconceptos:=TStringList.Create;
  tvariantes:=TObjectList<TStrings>.Create();
  ttext:=TObjectList<TStrings>.Create();
  for i:=0 to variantes.Count-1 do
  begin
    condiciones.Add('Clave_Variante='+variantes[i]);
  end;
  variante.Filtered:=false;
  variante.Filter:=ListToString(condiciones,' or ');
  variante.Filtered:=true;
  variante.First;
  while not variante.Eof do
  begin
    if not  AnsiMatchStr(variante.FieldByName('Clave_Concepto').AsString,idconceptos.ToStringArray) then
    begin
      idconceptos.Add('Clave_Concepto='+variante.FieldByName('Clave_Concepto').AsString);
    end;
    variante.Next
  end;
  concepto.Close;
  concepto.Open('select Lengua_Control from Concepto where '+ListToString(idconceptos,' or '));
  concepto.First;
  condiciones.Clear;
  while not concepto.Eof do
  begin
    if not AnsiMatchStr(concepto.FieldByName('Lengua_Control').AsString,conceptos.ToStringArray) then
    begin
      conceptos.Add(concepto.FieldByName('Lengua_Control').AsString);
      condiciones.Add('Lengua_Control='+QuotedStr(concepto.FieldByName('Lengua_Control').AsString));
      syndestino.Add(TStringList.Create);
      synorigen.Add(TStringList.Create);
      tvariantes.Add(TStringList.Create);
      ttext.Add(TStringList.Create);
    end;
    concepto.Next;
  end;
  concepto.Close;
  concepto.Open('select Clave_Concepto,Lengua_Control from Concepto where '+ListToString(condiciones,' or '));
  concepto.First;
  condiciones.Clear;
  idconceptos.Clear;
  while not concepto.Eof do
  begin
     i:=AnsiIndexStr(concepto.FieldByName('Lengua_Control').AsString,conceptos.ToStringArray);
     condiciones.Add('Clave_Concepto='+concepto.FieldByName('Clave_Concepto').AsString);
     idconceptos.Add(IntToStr(i));
     tconceptos.Add(concepto.FieldByName('Clave_Concepto').AsString);
     concepto.Next;
  end;
  variante.Filtered:=false;
  variante.Filter:=ListToString(condiciones,' or ');
  variante.Filtered:=true;
  variante.First;
  condiciones.Clear;
  while not variante.Eof do
  begin
    condiciones.Add('Clave_Variante='+variante.FieldByName('Clave_Variante').AsString);
    i:=AnsiIndexStr(variante.FieldByName('Clave_Concepto').AsString,tconceptos.ToStringArray);
    tvariantes[i].Add(variante.FieldByName('Clave_Variante').AsString);
    ttext[i].Add(variante.FieldByName('Variante').AsString);
    variante.Next;
  end;
  varpais.Filtered:=false;
  varpais.Filter:='(Clave_Pais='+QuotedStr(paisOrigen)+' or Clave_Pais='+QuotedStr(paisDestino)+') and ('+ListToString(condiciones,' or ')+')';
  varpais.Filtered:=true;
  varpais.First;
  while not varpais.Eof do
  begin
    
    j:=0;
    while j<tvariantes.Count do
    begin
      i:=AnsiIndexStr(varpais.FieldByName('Clave_Variante').AsString,tvariantes[j].ToStringArray);
      if i>=0 then
      begin
        if varpais.FieldByName('Clave_Pais').AsString=paisOrigen then
        begin
          synOrigen[j].Add(ttext[j][i]);
        end
        else
        begin
          synDestino[j].Add(ttext[j][i]);
        end;        
        break;
      end;
      j:=j+1;
    end;
    varpais.Next;
  end;
  condiciones.Free;
  idconceptos.Free;
  tvariantes.Free;
  ttext.Free;
  tconceptos.Free;
end;

function isValid(clave_variante:String;paises:String;varpaises:TFDTable):Boolean;
begin
  varpaises.Active:=true;
  varpaises.Filtered:=false;
  if varpaises.Filter<>paises then
  begin
    varpaises.Filter:=paises;
  end;
  varpaises.Filtered:=true;
  Result:=varpaises.Locate('Clave_Variante',clave_variante,[]);
end;

end.
