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

var db;

MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, (error, client) => {
    if (error) {
        console.log(error);
        return;
    }
    db = client.db('todoapp');

    app.listen(process.env.PORT, function () {
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
    res.redirect('/')
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