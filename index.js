const express = require('express')
const app = express()
const url = 'mongodb://hyeri:1234@13.72.117.233:27017/?authSource=admin';
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs');
const MongoClient = require('mongodb').MongoClient;

var db;

MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
    if (error) {
        console.log(error);
        return;
    }
    db = client.db('apple_db');

    db.collection('apple').insertOne({ 이름: 'John', _id: 100 }, (error, result) => {
        console.log('저장완료');
    });

    app.listen(8080, function () {
        console.log('listening on 8080')
    });
});

app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + '/index.html')
})

app.get('/write', function (요청, 응답) {
    응답.sendFile(__dirname + '/write.html')
});

app.post('/add', (req, res) => {
    db.collection('counter').findOne({ name: '게시물갯수' }, function (error, result) {
        var 총게시물갯수 = result.totalpost

        db.collection('post').insertOne({_id: 총게시물갯수 + 1, name : req.body.name, age : req.body.age},(error,result)=>{
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

app.get('/list', function (요청, 응답) {
    db.collection('post').find().toArray((에러, 결과) => {
        console.log(결과)
        응답.render('list.ejs', { posts: 결과 })
    })
})

app.delete('/delete',function(req, res){
    console.log(req.body);
    req.body._id = parseInt(req.body._id);

    db.collection('post').deleteOne(req.body,function(에러, 결과){
        console.log('삭제완료')
        res.status(200).send({message:'성공'});//응답코드 200을 보냄
    })
});