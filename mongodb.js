

// MongoDB
// The maximum size for a BSON document is 16 MB
// MongoDB supports up to 100 levels of nesting for BSON documents
// A collection can have a maximum of 64 indexes
// The length of an index name cannot exceed 125 characters. 
// A compound index can include a maximum of 31 fields
// MongoDB can be memory-intensive due to its handling of duplicate data and lack of efficient joins
// Without support for joins, MongoDB often requires data duplication, which can lead to increased storage requirements
// While MongoDB has improved its transaction capabilities, it still doesn’t match the robustness of traditional relational databases
// The flexibility in schema design can sometimes lead to challenges in maintaining data integrity and consistency
// Indexes can slow down write operations because every insert, update, or delete operation must also update the indexes
// Indexes consume additional memory. If you have many indexes, they can use a substantial amount of RAM



// creating a Schema Validator
db.createCollection("users", {
    validator: {
        $jsonSchema: {
            bsonType: 'object', 
            required: ['name', 'age', 'favourites'], 
            properties: {
                name: {
                    bsonType: 'string', 
                    description: 'must be a string and name is required' }, 
                age: { 
                    bsonType: ['double'], 
                    description: 'must be a floating point number and required'}, 
                favourites: {
                    bsonType: 'array', 
                    description: 'must be an array of string', 
                    items: { 
                        bsonType: 'string' 
                    }
                }
            }
        }
    }
}) 





// to modify the Json Schema Validator.
// we want both the 18 and 18.0 should be a valid age thus we need to set BsonType for age as ['int', 'double']
db.runCommand({
    "collMod": "users",
    validator: {
        $jsonSchema: {
            bsonType: 'object', 
            required: ['name', 'age', 'favourites'], 
            properties: {
                name: {
                    bsonType: 'string', 
                    description: 'must be a string and name is required' }, 
                age: { 
                    bsonType: ['int','double'], 
                    description: 'must be an integer or floating point number and required'}, 
                favourites: {
                    bsonType: 'array', 
                    description: 'must be an array of string', 
                    items: { 
                        bsonType: 'string' 
                    }
                }
            }
        }
    }    
})





// $lookup Operator
db.users.aggregate([{
    $lookup: {
        from: 'books',                          // collection name 
        localField: 'favourites',               // field name in users collection
        foreignField: 'id',                     // corresponding field name in books collection 
        as: 'bookSummary'
    }
}])




// $expr operator
// This query will return all documents where the favourites array has 1 or more elements.
db.users.find({
    $expr: { $gt: [{ $size: "$favourites" }, 1] }
})



// This query will return all documents in the books collection where the author field includes the substring "Jonas" and case insensitive
db.books.find({
    author: { $regex: "Jonas", $options: "i" }
})


// using $expr
db.books.find({
    $expr: {
        $regexMatch: {
            input: "$author",
            regex: "Jonas"
        }
    }
})


// find  products where the orderDate is within the last 10 days
db.products.find({
    $expr: {
        $gte: [
            "$orderDate",
            {
                $subtract: [new Date(), 10 * 24 * 60 * 60 * 1000]
            }
        ]
    }
})
  


// checks if the discounted price is less than Discount
db.products.find({
    $expr: {
        $lte: [{ $subtract: ["$price", "$discount"] }, "$discount"]
    }
})
  


// we want to find those users where each item in hobbies array includes frequency >= 3
// {
//     _id: ObjectId('66d55b24a8ac30b1dde8e3e8'),
//         name: 'Max',
//         hobbies: [
//             { title: 'Sports', frequency: 3 },
//             { title: 'Cooking', frequency: 6 }
//         ],
//         phone: 131782734
// }

db.users.find({
    $expr: {
        $allElementsTrue: {
            $map: {
                input: "$hobbies",
                as: "hobby",
                in: { $gte: ["$$hobby.frequency", 3] }
            }
        }
    }
})
  


// $elemMatch
// [
//     {
//         _id: ObjectId('66d55b24a8ac30b1dde8e3e8'),
//         name: 'Max',
//         hobbies: [
//             { title: 'Sports', frequency: 4 },
//             { title: 'Cooking', frequency: 6 }
//         ],
//         phone: 131782734
//     }
// ]
// We Want to find exactly the object {title: 'Sports' , frequency: 4}
db.users.find({hobbies: {$elemMatch: { title: 'Sports' , frequency: {$gte: 4}}}})

// we want to update the first object inside Hobbies array of maching Document and set new Frequency as 3
db.users.updateOne(
    {hobbies: {$elemMatch: { title: 'Sports' , frequency: {$gte: 4}}}}, 
    {$set: {"hobbies.$.frequency": 3}}
)


// $addToSet
// will not insert this object into reviews array if it already exists
// where $push will let you insert duplicate elements
db.products.updateOne(
    {_id: ObjectId('66d55332faac7b2cfa0ec4f9')},
    {reviews: {$addToSet: {
        user: 'David Wilson',
        rating: 5,
        comment: 'Excellent build quality and performance.'
      }}}
)









// Indexing in MongoDB

// Creating a Single Field Index
// creating an Index on users NAME field . 
// 1 or -1 defines order though mongodb can look for keys in any direction
// to examine the details of a find query we attach explain() method 
// for example db.users.find({name : 'Anna'}).explain('executionStats') will display detail explanation of how mongodb performed this scan 
db.users.createIndex( { name : 1} )


// Creating a Compound Index
// we can include multiple fields while creating an Index
// the order of the field matters here 
// if we want to find users by only age then COLLECTION SCAN  will be Prefered and We Don't get Benifited from creating an Index
// if we want to find users by name field or name and age field then INDEX SCAN will be used 
db.users.createIndex({ name: 1 , age: 1 })



//Partial Filters
// we can speed up more by applying Partial Filters
// suppose we frequently search for users with age greater or equal to 70
// instead of only creating a Index on age field we can do bellow 
db.users.createIndex({age: 1}, {partialFilterExpression: {age: {$gte: 70}}})

// TTL or Time To Live Index
// suppose we have user sessions and don't want to keep them in databse for longer period 
// we can create TTL Index so that after a certain amount of Time the Documents gets deleted automatically
// we do this while creating a Index by specifying {expireAfterSeconds: 10"}
// the documents which were inserted before Creating TTL index do not get affected 
// In below example every session will be removed after 10 seconds 
db.sessions.createIndex({ createdAt : 1} , {expireAfterSeconds: 10})


// Covered Query
// suppose we created an Index on Users "name" field
// while finding the Users by name if we perform Projection on the Field which was used to create Index then we can speed up our query
// we created an Index on users name field
// when finding users by name if we do projection and exclude other fields rather than name then the Query gets Covered
db.users.createIndex({'name' : 1})
db.users.find({name: 'max'}, {_id: 0 , name: 1})


// Text Index

// we should avoid creating more than one Text Index
// we are creating a text Index on description Field
db.products.createIndex({description: 'text'}) 

// as we have text index in the collection we can perform Text search 
// we do not specify field name while finding because we normally do no create more than one text index in a collection
// the following query will search for documents where description field contains either "red" or "book"
db.products.find({$text: {$search: 'red book'}})

// if we want to match exactly the phrase "red book" we need to put it inside quotes and escape the quotes
db.products.find({$text: {$search: '\'red book\''}})

// TEXT INDEXES & SORTING
// when we create a TEXT INDEX on a collection and then perform a text search MongoDB sorts the results according to their score 
// which we can visualize using {$meta: "textScore"} as a second argument in find querys
// [
//     {
//         _id: ObjectId('66d68d65733be85645e8e3e8'),
//         title: 't-shirt',
//         description: 'this is an awesome T-shirt'
//     },
//     {
//         _id: ObjectId('66d68d81733be85645e8e3e9'),
//         title: 'watch',
//         description: 'this is an awesome watch and a bit pricey'
//     }
// ]
db.products.find({$text: {$search: 'awesome watch'}})
// MongoDB will return both these products as a result but in order to know how MongoDB sorts the results we need to do the following
// which will add a "score" field in resulting documents 
db.products.find({ $text: {$search: 'awesome watch'}}, {score: {$meta: 'textScore'}})
// [
//     {
//         _id: ObjectId('66d68d65733be85645e8e3e8'),
//         title: 't-shirt',
//         description: 'this is an awesome T-shirt',
//         score: 0.6666666666666666
//     },
//     {
//         _id: ObjectId('66d68d81733be85645e8e3e9'),
//         title: 'watch',
//         description: 'this is an awesome watch and a bit pricey',
//         score: 1.25
//     }
// ]

// if want to sort the results accordingto their scores:
db.products.find({ $text: {$search: 'awesome watch'}}, {score: {$meta: 'textScore'}}).sort({score: {$meta: 'textScore'}})

// [
//     {
//         _id: ObjectId('66d68d81733be85645e8e3e9'),
//         title: 'watch',
//         description: 'this is an awesome watch and a bit pricey',
//         score: 1.25
//     },
//     {
//         _id: ObjectId('66d68d65733be85645e8e3e8'),
//         title: 't-shirt',
//         description: 'this is an awesome T-shirt',
//         score: 0.6666666666666666
//     }
// ]


// Compound Text Index
// we can include multiple fields while creating Text Indexes 
//     {
//         _id: ObjectId('66d68d65733be85645e8e3e8'),
//         title: 't-shirt',
//         description: 'this is an awesome T-shirt'
//     }
db.products.createIndex({ title: 'text', description: 'text'})

// Excluding keywords
// if we put a "-" sign in front of a keyword during a Text Search Mongodb will exclude documents which contains this word
// In below query we don't want to find documents where "watch" is present
db.shop.find({ $text: {$search: 'awesome -watch'}}, {score: {$meta: 'textScore'}})


//Default Language
db.products.createIndex({title: 'text', description: 'text'}, {default_language: 'english'})

// Weights
// we can assign weights to fields so that when we perform a text search 
db.products.createIndex({title: 'text', description: 'text'}, {weights: {title: 1, description: 10}})

// Creating Index in the Background so That the collection do not get locked Down while creating Index
db.products.createIndex({ title: 'text'}, {background: true})


// Geospatial Query
// In order to perform geospatial query such as $near, $geoWihin we need to create a geospatial Index first on geoJson Object
// {
//     _id: ObjectId('66d5ba1425afa7a7a3cf4c6e'),
//     username: 'mr victor pedersen',
//     age: 59,
//     address: { type: 'Point', coordinates: ['-31.0208', '-29.8113'] }
// }
db.users.createIndex({'address': '2dsphere'})


// In order to find users near a specific user
// Here address is the field name in user document which is a geoJson Object
db.users.find({ address: { $near: { $geometry: { type: 'Point', coordinates: [-179.9718, 49.0997]}} } })

// $geoWithin
// Find Places Inside a Certain Area 
// we will pick 4 Points which will form a Polygon
// Point1 = [ 178.9041, 54.9518 ]
// Point2 = [ 171.0406, 48.5718 ]
// Point3 = [ 170.6875, 47.6835 ]
// Point4 = [ -174.227, 54.4905 ]

db.users.find({ address: { $geoWithin: { $geometry: { type: 'Polygon', coordinates: [[ Point1, Point2, Point3, Point4, Point1 ]]}} } })





// $geoIntersects

// We Have a Collection Named "areas" where each document represents some enclosed Area and looks like below doc
// {
//     _id: ObjectId('66d6c5dc54872159cfe8e3e8'),
//     title: 'Area 1',
//     address: {
//         type: 'Polygon',
//         coordinates: [
//                 [
//                     [178.9041, 54.9518],
//                     [171.0406, 48.5718],
//                     [170.6875, 47.6835],
//                     [-174.227, 54.4905],
//                     [178.9041, 54.9518]
//                 ]
//             ]
//     }
// }

// {
//     _id: ObjectId('66d6c5dc54872159cfe8e3e8'),
//         title: 'Area 2',
//         address: {
//         type: 'Polygon',
//             coordinates: [
//                 [
//                     [124.9041, 54.9518],
//                     [171.0406, 48.5718],
//                     [170.6875, 47.6835],
//                     [-174.227, 54.4905],
//                     [124.9041, 54.9518]
//                 ]
//             ]
//     }
// }

// we want to see in which Area this user with coordinates [170.6875, 47.6835] belongs to
db.areas.find({ address: {$geoIntersects: {$geometry: { type: 'Point', coordinates:[170.6875, 47.6835]}}}})


// $centerSphere
// find users within a certain radius
// we have a user named 'ms rosl puls' with coordinates  [ 178.9041, 54.9518 ]
// we want to find other users within 4 kilometers Radius
// we need to first convert the Distance(2000m) to Radian
// The equatorial radius of Earth is approximately 3,963.2 miles or 6,378.1 kilometers.
// Mile to Radians : Distance(Miles) / 3963.2
// Kilometers to Radians : Distance(Kilometers) / 6378.1
db.users.find({ address: { $geoWithin: { $centerSphere: [[178.9041, 54.9518], (4/6378.1)] } } })



// Aggregation Framework

// Aggregation Pipeline

// $match Stage
// Like other MongoDB operations, this uses the standard MongoDB queries to filter documents without any modification and then passes them to the next stage
// In order to achieve the best performance of the $match stage, use it early in the aggregation process since it will:
// 1. Take advantage of the indexes hence become much faster
// 2. Limit the number of documents that will be passed to the next stage.
// However, you must not use the $where clause in this $match stage since it is catered for within the match condition.

// {
//     _id: ObjectId('66d80012e444e68b2ee1c4de'),
//     gender: 'male',
//     name: { title: 'mr', first: 'carl', last: 'jacobs' },
//     location: {
//       street: '6948 springfield road',
//       city: 'arklow',
//       state: 'wicklow',
//       postcode: 71309,
//       coordinates: { latitude: '-29.6721', longitude: '-154.6037' },
//       timezone: { offset: '-11:00', description: 'Midway Island, Samoa' }
//     },
//     email: 'carl.jacobs@example.com',
//     login: {
//       uuid: '4f591981-b214-4430-9902-70bc0faa7e81',
//       username: 'organicladybug144',
//       password: 'hank',
//       salt: 'PC6Ig6sD',
//       md5: 'd94aac977512cb2bb005dfa360b40018',
//       sha1: 'a5ffeb65557693e443e195bdf9c066dca33dc47d',
//       sha256: 'f9aa851b943d9a8a876062e48b91b9af190a37779df009a20bc268c25ce48a7f'
//     },
//     dob: { date: '1984-09-30T01:20:26Z', age: 33 },
//     registered: { date: '2008-10-29T02:25:24Z', age: 9 },
//     phone: '031-501-5147',
//     cell: '081-090-3541',
//     id: { name: 'PPS', value: '9806982T' },
//     picture: {
//       large: 'https://randomuser.me/api/portraits/men/44.jpg',
//       medium: 'https://randomuser.me/api/portraits/med/men/44.jpg',
//       thumbnail: 'https://randomuser.me/api/portraits/thumb/men/44.jpg'
//     },
//     nat: 'IE'
//   }
// Below query will look for  Users with age greater or equal to 50
db.users.aggregate([
     { $match: { "dob.age": { $gte: 50 } } }
])



// $group stage
// For a specified expression, data is grouped accordingly in this stage. For every distinct group that is formed, 
// it is passed to the next stage as a document with a unique _id field.
// For our users collection above, we will group the documents using the "state" field and see how many groups we will get.
// We can go further and sum the number of people in each of this group with an accumulator expression of sum

db.users.aggregate([
    { $group: { _id: '$location.state', numberOfPeople: { $sum: 1} } }
])


// $project stage
// In this stage, the documents are modified either to add or remove some fields that will be returned.
// 1. If a field is described with a value of 1 or true, the document that is to be returned will have that field.
// 2. You can suppress the _id field so that it cannot be returned by describing it with 0 or false value.
// 3. You can add a new field or reset the field by describing it with a value of some expression.
// 4. The $project operation will basically treat a numeric or boolean values as flags. 
// For this reason, you will need to use the $literal operator for you to set a field value numeric or boolean.
// In Below Query we are excluding _id field and doing projection on the name field then returning a new field username

db.users.aggregate([
    {$project: {_id: 0, username: {$concat: ["$name.title", " ", "$name.first", " ", "$name.last"]}}}
])


// $match + $group + $sort
db.users.aggregate([
    { $match: { "dob.age": { $gte: 40 } }}, 
    { $group: { _id: { state: "$location.state" }, numberOfPeople: { $sum: 1 } } }, 
    { $sort: { "numberOfPeople": 1 } }
])

// In below $project stage we are excluding _id field returning a new field username
// we are converting each field in the name to camelCase except title using $toUpper , $substrCP, $strLenCP , $subtract

db.users.aggregate([
    {
        $project: {
            _id: 0,
            username: {
                $concat: [
                    { $toUpper: "$name.title" },
                    " ",
                    { $toUpper: { $substrCP: ["$name.first", 0, 1] } },
                    { $substrCP: ["$name.first", 1, { $subtract: [{ $strLenCP: "$name.first" }, 1] }] },
                    " ",
                    { $toUpper: { $substrCP: ["$name.last", 0, 1] } },
                    { $substrCP: ["$name.last", 1, { $subtract: [{ $strLenCP: "$name.last" }, 1] }] }
                ]
            }
        }
    }
])






// we want to transform users birtYear into a valid ISODate 
// inside $project stage we are doing projection on dob field and returning 2 new field age and birthdate 
// using $convert
db.users.aggregate([
    {$project: {
        _id: 0,
        name: 1,
        birthdate: {$convert: {input: '$dob.date', to: 'date', onError: 0.0, onNull: 0.0}},
        age: '$dob.age',
    }}
])

// using $toDate
db.users.aggregate([
    {$project: {
        _id: 0,
        name: 1,
        birthdate: {$toDate: '$dob.date'},
        age: '$dob.age',
    }}
])





// we want to transform users location into a valid geoJson Object where we should specify type and coordinates
// inside coordinates longitude appears first and then latitude
// using $convert
db.users.aggregate([
    {$project: {
        _id: 0,
        name: 1,
        age: '$dob.age',
        address: {
            type: 'Point', 
            coordinates: [ 
                {$convert: {input: '$location.coordinates.longitude', to: 'double', onError: 0.0 , onNull: 0.0}},
                {$convert: {input: '$location.coordinates.latitude', to: 'double', onError: 0.0 , onNull: 0.0}}  
            ] 
        } 
    }}
])
// using $toDouble
db.users.aggregate([
    {$project: {
        _id: 0,
        name: 1,
        age: '$dob.age',
        address: {type: 'Point', coordinates: [{$toDouble: "$location.coordinates.longitude"}, {$toDouble: "$location.coordinates.latitude"}]} 
    }}
])


// $isoWeekYear
// we are converting the string date to ISODate format first then extracting the Year
// we can not directly do this on date which is in string format

db.users.aggregate([
    {$project: {
        _id: 0,
        name: 1,
        birthdate: {$toDate: '$dob.date'},
        age: '$dob.age',
    }},
    {$project: {
        name: 1,
        age: 1,
        birthYear: {$isoWeekYear: '$birthdate'}
    }}
])



// $filter
// We want to keep the scores that is greater or equal to 60
// we are using filter which takes an ARRAY as input and filtering out scores that is not meeting our criteria
// {
//     _id: ObjectId('66d87dc91158b23604e8e3e8'),
//     name: 'Max',
//     hobbies: [ 'Sports', 'Cooking' ],
//     age: 29,
//     examScores: [
//       { difficulty: 4, score: 57.9 },
//       { difficulty: 6, score: 62.1 },
//       { difficulty: 3, score: 88.5 }
//     ]
// }
db.students.aggregate([
    {$project: {
        _id: 0, 
        name: 1, 
        scores: {$filter: {input: '$examScores', as: 'sc', cond: {$gte: ['$$sc.score', 50]}}}
    }}
])





// $unwind
// $unwind operator in MongoDB is an aggregation stage that deconstructs array fields in a document to 
// output a separate document for each element in the array
// {
//     _id: ObjectId('66d87dc91158b23604e8e3e8'),
//     name: 'Max',
//     hobbies: [ 'Sports', 'Cooking' ],
//     age: 29,
//     examScores: [
//       { difficulty: 4, score: 57.9 },
//       { difficulty: 6, score: 62.1 },
//       { difficulty: 3, score: 88.5 }
//     ]
// }
// we want to pull out every Exam score in a new field name scores and group them by name
db.students.aggregate([
    {$unwind: "$examScores"},
    {$group: {_id: '$name' , scores: {$push: '$examScores.score'} }}
])




// we are pulling out every score object inside examScores field
// keeping each score in a top level field named "score"
// then we are sorting them in descending order so that for each user highest score appears first
// then we are grouping them by _id , assigning a new field "name" which will be the first value of field name in the group then another new field "maximumScore"
// then sorting users by their highest score 
db.students.aggregate([
    {$unwind: "$examScores"},
    {$project: {_id: 1, name: 1, score: "$examScores.score"}},
    {$sort: {score: -1}},
    {$group: {_id: '$_id', name: {$first: '$name'}, maximumScore: {$max: '$score'}}},
    {$sort: {highestScore: -1}}
])



// in the $project stage we are forming a new field called "username" by concatenating first and last name and another new field "birthdate"
// in second stage we are sorting users according to their date of birth in Ascending order
// in the third stage we are skipping the first 10 documents
// in the 4th stage we are limiting the result to 11 documents
db.users.aggregate([
    {$project: {_id: 0, username: {$concat: ["$name.first", " ", "$name.last"]}, birthdate: {$toDate: "$dob.date"}}},
    {$sort: {dateOfBirth: 1}},
    {$skip: 10},
    {$limit: 11}
])





// $bucket 
// The $bucket operator is similar to the $group operator, 
// but instead of grouping by a specific field, $bucket groups documents based on a range of values.
db.users.aggregate([
    {$bucket: {
        groupBy: "$dob.age", 
        boundaries: [0,30, 41,70, 71,80], 
        default: 'Others',
        output: {
            numberOfPersons: {$sum : 1}, 
            average: {$avg: "$dob.age"}
        }
    }}
])




// $bucketAuto
// $bucketAuto is a MongoDB aggregation operator that automatically determines the boundaries for grouping documents based on a specified field. 
// It's similar to the $bucket operator, but instead of specifying explicit boundaries, $bucketAuto calculates the boundaries automatically based on the data distribution.
db.users.aggregate([
    {
        $bucketAuto: {
            groupBy: "$dob.age",
            buckets: 4,
            output: {
                numberOfPersons: { $sum: 1 },
                averageAge: { $avg: "$dob.age" }
            }
        }
    }
])








// Geospatial query 
// in order to use them we need to first create "geospatial" Index
// In an Aggregation Pipeline only in the first stage we can utilize the Index
// the geospatial query must be in the first stage at Aggregation pipeline in order to use geospatial index
// below is an example with $geoNear , where we are finding users near to a certain user
// near : the reference point 
// maxDistance: the boundary 
// limit: number of docs to return
// query : conditions that should be satisfied
// distanceField: new field name in output document
db.transformedUsers.aggregate([
    {
        $geoNear: {
            near: {
                type: 'Point',
                coordinates: [ -154.6037, -29.6721 ]
            },
            maxDistance: 400000,
            query: { age: { $gt: 30 } },
            distanceField: "distance"
        }
    },
    {
        $limit: 10
    },
    {
        $sort: {distance : 1}
    }
])





// $output
// the results after aggregation operation will be stored on a new COLLECTION 'transformedUsers'
db.users.aggregate([
    { $project: { 
        _id: 0,
        username: {$concat: [
            {$toUpper: {$substrCP: ["$name.title", 0, 1]}}, 
            {$substrCP: ["$name.title", 1,{$subtract: [{$strLenCP: "$name.title"}, 1]} ]},
            " ",
            {$toUpper: {$substrCP: ["$name.first", 0, 1]}}, 
            {$substrCP: ["$name.first", 1,{$subtract: [{$strLenCP: "$name.first"}, 1]} ]},
            " ",
            {$toUpper: {$substrCP: ["$name.last", 0, 1]}}, 
            {$substrCP: ["$name.last", 1,{$subtract: [{$strLenCP: "$name.last"}, 1]} ]}
        ]},
        age: "$dob.age",
        mail: "$email",
        birthdate: {$toDate: "$dob.date"},
        state: "$location.state",
        geolocation: {
            type: 'Point', 
            coordinates: [{$convert: {input:"$location.coordinates.longitude" , to: 'double', onError: 0.0, onNull: 0.0}} , {$convert: {input:"$location.coordinates.latitude" , to: 'double', onError: 0.0, onNull: 0.0}}  ]}
    }},
    {$out: 'transformedUsers'}
])







// Transactions
// must be running a replica set with at least three nodes (primary and two secondaries)
// The replica set must be running MongoDB 3.6 or later
// must be using the WiredTiger storage engine, which is the default storage engine in MongoDB 3.2 and later
// must have a read concern of "local" or "majority" and a write concern of "majority" to ensure that the transaction is durable

// initiating a session
const session = db.getMongo().startSession()

// starting a Transaction
session.startTransaction()

// performing some crud operations
const database = session.getDatabase('nameOfDatabase')
database.collection_name.insertOne({name : 'John', age: 45})

// comitting a transaction
session.commitTransaction()


// aborting transaction 
session.abortTransaction()


// Transaction Timeout
// MongoDB transactions have a timeout period, which is set to 1 minute by default
// If the transaction doesn't complete within the timeout period, it will be automatically aborted
// adjust the timeout period using the commitTransaction() method with an options object:
session.commitTransaction({ timeout: 300000 }) // 5-minute timeout (5 * 60 * 1000) milliseconds