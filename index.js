const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()

app.use('/public', express.static('public'));
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

const {ObjectId} = require('mongodb');

const http = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

var db;

MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, (error, client) => {
    if (error) {
        console.log(error);
        return;
    }
    db = client.db('todoapp');

    http.listen(process.env.PORT, function () {
        console.log('listening on 8080')
    });
});

app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + '/index.html')
})

app.get('/write', function (요청, 응답) {
    응답.render('write.ejs')
});



app.get('/list', function (요청, 응답) {
    db.collection('post').find().toArray((에러, 결과) => {
        console.log(결과)
        응답.render('list.ejs', { posts: 결과 })
    })
})

app.get('/detail/:id',function(req,res){
    db.collection('post').findOne({_id:parseInt(req.params.id)},function(error,result){
        console.log(result);
        if(error){
            console.log(error);
            res.status(404).send('데이터없음')
            return;
        }
        res.render('detail.ejs',{data:result});
    })
})

app.get('/edit/:id', function (req, res) {
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (error, result) {
        console.log(result)
        if (error) {
            console.log(error);
            res.status(404).send('데이터없음')
            return;
        }
        res.render('edit.ejs', { post: result })
    })
})

app.put('/edit',function(req, res){
    db.collection('post').updateOne({_id : parseInt(req.body.id)},{$set : {name : req.body.name, age : req.body.age}},function(error, result){
        console.log('수정완료')
        res.redirect('/list')
    })
})


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());


app.get('/login',(req,res)=>{
    res.render('login.ejs')
})

app.post('/login',passport.authenticate('local',{failureRedirect : '/fail'}),(req,res)=>{
    res.redirect('/chat')
})

app.get('/fail',(req,res)=>{
    res.render('loginfail.ejs')
})

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, (inputid, inputpw, done) => {
    db.collection('login').findOne({ id: inputid }, (error, result) => {
        if (error) return done(error)
        if (!result) return done(null, false, { message: '존재하지 않는 아이디' })
        if (inputpw == result.pw) {
            return done(null, result)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

passport.serializeUser((user, done) => {
    done(null, user.id)
  });

passport.deserializeUser((inputid, done) => {
    db.collection('login').findOne({ id: inputid }, (error, result) => {
      done(null, result)
    })
  }); 

app.post('/register', (req, res) => {
    db.collection('login').findOne({ id: req.body.id }, (error, result) => {
        if (result) {
            res.send('아이디 중복입니다')
            return;
        }
        else {
            db.collection('login').insertOne({ id: req.body.id, pw: req.body.pw }, (error, result) => {
                res.redirect('/')
            })
        }
    })
})

app.post('/add', (req, res) => {
    db.collection('counter').findOne({ name: '게시물갯수' }, function (error, result) {
        var 총게시물갯수 = result.totalpost;
        var post = {_id: 총게시물갯수 + 1,  작성자:req.user._id, name : req.body.name, age : req.body.age, 날짜 : new Date()}
        
        db.collection('post').insertOne(post,(error,result)=>{
            db.collection('counter').updateOne({name : '게시물갯수'},{$inc: {totalpost:1}},(error,result)=>{
                if(error){
                    console.log(error);
                    return;
                }
                res.send('전송완료');
            })
        });
    });

});

app.delete('/delete', function (req, res) {
    console.log(req.body);
    req.body._id = parseInt(req.body._id);

    db.collection('post').deleteOne({_id: req.body._id, 작성자: req.user._id}, function (에러, 결과) {
        console.log('삭제완료')
        res.status(200).send({ message: '성공' });//응답코드 200을 보냄
    })
});

app.get('/mypage',loginfc, (req,res)=>{
    console.log(req.user);
    res.render('mypage.ejs')
})

function loginfc(req, res, next) {
    if (req.user) {
        next()
    }
    else {
        res.send('로그인하세요')
    }
}

app.get('/logout', (req, res) => {
    console.log('logout')
    req.logout()
    res.send('로그아웃 되셨습니다.')
})

app.get('/search', (req, res)=>{
    var 검색조건 = [
        {
          $search: {
            index: 'name_Search',
            text: {
              query: req.query.value,
              path: 'name'  // 어떤 항목에서 찾고싶은지
            }
          }
        }
      ] 
      db.collection('post').aggregate(검색조건).toArray((error, result)=>{
        console.log(result)
        res.render('search.ejs', {posts : result})
      })
    })

    app.get('/chat',loginfc, (req,res)=>{
        db.collection('chatroom').find({ member : req.user._id }).toArray().then((result)=>{
            console.log(result);
            res.render('chat.ejs', {data : result})
          })
    })

    app.post('/chatroom', loginfc, (req,res)=>{
        const chatroomdata = {
            title : 'chatroom name',
            member : [ObjectId(req.body.당한사람id), req.user._id],
            date : new Date()
        }
        db.collection('chatroom').insertOne(chatroomdata).then ((result)=> {
            res.send('저장완료');
        });
    })

    app.get('/chat',loginfc, (req, res)=>{
        db.collection('chatroom').find({member:req.user._id}).toArray().then((result)=>{
            res.render('chat.ejs',{data:result})
        })
    })

    app.post('/message',loginfc, (req,res)=>{
        var savemessage = {
            parent : req.body.parent,
            content : req.body.content,
            userid : req.user.id,
            date : new Date()
        }
        db.collection('message').insertOne(savemessage).then((result)=>{
            res.send(result);
            console.log('DB 저장 성공')
        })
    });

    app.get('/message/:parentid', loginfc, function(req, res){

        res.writeHead(200, {
          "Connection": "keep-alive",
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
      
        db.collection('message').find({ parent: req.params.parentid }).toArray()
        .then((result)=>{
          console.log(result);
          res.write('event: test\n');
          res.write(`data: ${JSON.stringify(result)}\n\n`);
        });
        
        const 찾을문서 = [
            { $match: { 'fullDocument.parent': req.params.parentid } } //이 조건에 만족하는 document만 감시하고 있음
        ];

        const changeStream = db.collection('message').watch(찾을문서); //watch(찾을문서)를 붙여줌 -> 찾을 문서를 실시간 감시해줌

        changeStream.on('change', (result) => {         //이벤트리스너를 붙여서 DB에 변동사항 생길때마다 콜백함수 내부 코드 실행
            console.log(result.fullDocument);           //변동사항은 result.fullDocument 안에 저장됨
            var 추가된문서 = [result.fullDocument];      //서버에서 document 다 찾아서 보낼 때 [{},{},..] 이런모양이여서 []로 감싸줌
            res.write('event: test\n');
            res.write(`data: ${JSON.stringify(추가된문서)}\n\n`);
        });

      });

      app.get('/socket',(req,res)=>{
          res.render('socket.ejs')
      })
      io.on('connection', function (socket) {       //소켓이 연결되면
        console.log('소켓 연결됨');
        socket.on('user-send', function (data) {        //user-send라는 이벤트가 발생하면(user-send 유저가 메세지를 보내면) 함수실행, data엔 유저가 보낸 글이 들어있음(위에 hi hi가 들어감)
          io.emit('broadcast', data)  //모든사람에게 유저가 보낸 data 전송
        });
       
      });
